/**
 * WeatherService - Phase 11
 *
 * Fetches and caches weather data for sites.
 * BR-11-07 to BR-11-09 (C-276 to C-278)
 */

const { query } = require('../config/db');
const axios = require('axios');
const env = require('../config/env');

/**
 * Parse and normalize weather data from OpenWeatherMap response
 *
 * @param {Object} data - Raw API response
 * @returns {Object} Normalized weather data
 */
const normalizeWeatherData = (data) => {
  if (!data || !data.main) {
    return null;
  }

  const tempC = data.main.temp ? Math.round(data.main.temp - 273.15) : null;
  const feelsLikeC = data.main.feels_like ? Math.round(data.main.feels_like - 273.15) : null;

  return {
    tempC,
    feelsLikeC,
    humidity: data.main.humidity,
    condition: data.weather?.[0]?.main || 'Unknown',
    description: data.weather?.[0]?.description || '',
    icon: data.weather?.[0]?.icon || null,
    windKph: data.wind?.speed ? Math.round(data.wind.speed * 3.6) : null,
    windDeg: data.wind?.deg || null,
    precipMm: data.rain?.['1h'] || data.snow?.['1h'] || 0,
    cloudCover: data.clouds?.all || 0,
    visibility: data.visibility || null,
    sunrise: data.sys?.sunrise ? new Date(data.sys.sunrise * 1000).toISOString() : null,
    sunset: data.sys?.sunset ? new Date(data.sys.sunset * 1000).toISOString() : null,
    raw: data
  };
};

/**
 * Generate summary text for weather
 *
 * @param {Object} weather - Normalized weather data
 * @returns {string} Human-readable summary
 */
const generateSummaryText = (weather) => {
  if (!weather) {
    return 'Weather information currently unavailable';
  }

  const parts = [];

  if (weather.tempC !== null) {
    parts.push(`${weather.tempC}°C`);
    if (weather.feelsLikeC !== null && Math.abs(weather.tempC - weather.feelsLikeC) >= 3) {
      parts.push(`(feels like ${weather.feelsLikeC}°C)`);
    }
  }

  if (weather.condition) {
    parts.push(weather.condition.toLowerCase());
  }

  if (weather.windKph && weather.windKph >= 20) {
    parts.push(`with ${weather.windKph} km/h winds`);
  }

  if (weather.precipMm > 0) {
    parts.push(`${weather.precipMm}mm precipitation`);
  }

  return parts.join(', ') || 'Current conditions';
};

/**
 * Get weather data for a site, using cache when available
 * BR-11-07, BR-11-08 (C-276, C-277)
 *
 * @param {number} siteId - Site ID
 * @param {number} orgId - Organisation ID (optional for scoping)
 * @returns {Object} Weather data with status
 */
const getWeatherForSite = async (siteId, orgId = null) => {
  try {
    // Check cache first
    const cacheResult = await query(`
      SELECT wc.data_json, wc.as_of, wc.expires_at
      FROM weather_cache wc
      WHERE wc.site_id = $1
        AND wc.expires_at > NOW()
      ORDER BY wc.as_of DESC
      LIMIT 1
    `, [siteId]);

    if (cacheResult.rowCount > 0) {
      const cached = cacheResult.rows[0];
      const normalized = normalizeWeatherData(cached.data_json);
      return {
        status: 'ok',
        ...normalized,
        summaryText: generateSummaryText(normalized),
        updatedAt: cached.as_of,
        fromCache: true
      };
    }

    // Get site location - prefer site_locations table, fall back to sites table
    const locationResult = await query(`
      SELECT 
        COALESCE(sl.latitude, s.latitude) as latitude,
        COALESCE(sl.longitude, s.longitude) as longitude,
        sl.weather_location_id,
        COALESCE(sl.city, s.city) as city,
        COALESCE(sl.country_code, s.country_code) as country_code,
        s.name as site_name
      FROM sites s
      LEFT JOIN site_locations sl ON sl.site_id = s.id
      WHERE s.id = $1
    `, [siteId]);

    if (locationResult.rowCount === 0) {
      return {
        status: 'error',
        error: 'Site location not configured',
        summaryText: 'Weather unavailable - location not set'
      };
    }

    const location = locationResult.rows[0];
    const { latitude, longitude, weather_location_id, city, country_code } = location;

    // Check if we have API key configured
    if (!env.weatherApiKey) {
      console.warn('[WeatherService] No WEATHER_API_KEY configured');
      return {
        status: 'error',
        error: 'Weather API not configured',
        summaryText: 'Weather unavailable - service not configured'
      };
    }

    // Build API URL - ensure base URL doesn't already have /weather appended
    // User may set WEATHER_API_BASE_URL as https://api.openweathermap.org/data/2.5 or https://api.openweathermap.org/data/2.5/weather
    const baseUrl = env.weatherApiBaseUrl.replace(/\/weather\/?$/, '');
    const weatherEndpoint = `${baseUrl}/weather`;

    // Build API URL - prefer lat/long, fallback to city/country
    let url;
    if (latitude && longitude) {
      url = `${weatherEndpoint}?lat=${latitude}&lon=${longitude}&appid=${env.weatherApiKey}`;
    } else if (weather_location_id) {
      url = `${weatherEndpoint}?id=${weather_location_id}&appid=${env.weatherApiKey}`;
    } else if (city && country_code) {
      url = `${weatherEndpoint}?q=${encodeURIComponent(city)},${country_code}&appid=${env.weatherApiKey}`;
    } else {
      return {
        status: 'error',
        error: 'Insufficient location data',
        summaryText: 'Weather unavailable - location incomplete'
      };
    }

    console.log(`[WeatherService] Fetching weather for site ${siteId}: lat=${latitude}, lon=${longitude}`);

    // Fetch from API with timeout
    const response = await axios.get(url, {
      timeout: env.weatherTimeoutMs
    });

    console.log(`[WeatherService] Success for site ${siteId}: ${response.data?.main?.temp}K (${Math.round(response.data?.main?.temp - 273.15)}°C), ${response.data?.weather?.[0]?.main}`);

    const normalized = normalizeWeatherData(response.data);

    // Update cache
    const expiresAt = new Date(Date.now() + (env.weatherCacheTtlSeconds * 1000));
    await query(`
      INSERT INTO weather_cache (site_id, organisation_id, data_json, as_of, expires_at)
      VALUES ($1, $2, $3::jsonb, NOW(), $4)
      ON CONFLICT (site_id) DO UPDATE
      SET data_json = $3::jsonb, as_of = NOW(), expires_at = $4, organisation_id = COALESCE($2, weather_cache.organisation_id)
    `, [siteId, orgId, JSON.stringify(response.data), expiresAt]);

    return {
      status: 'ok',
      ...normalized,
      summaryText: generateSummaryText(normalized),
      updatedAt: new Date().toISOString(),
      fromCache: false
    };
  } catch (error) {
    // Log full error details for debugging
    const httpStatus = error.response?.status;
    const httpData = error.response?.data;
    const errorCode = error.code; // e.g., ECONNREFUSED, ETIMEDOUT

    console.error(`[WeatherService] Error fetching weather for site ${siteId}:`);
    console.error(`  - Message: ${error.message}`);
    if (httpStatus) {
      console.error(`  - HTTP Status: ${httpStatus}`);
      console.error(`  - Response: ${JSON.stringify(httpData)}`);
    }
    if (errorCode) {
      console.error(`  - Error Code: ${errorCode}`);
    }

    // Try to return stale cache as fallback (BR-11-09)
    try {
      const staleCacheResult = await query(`
        SELECT wc.data_json, wc.as_of
        FROM weather_cache wc
        WHERE wc.site_id = $1
        ORDER BY wc.as_of DESC
        LIMIT 1
      `, [siteId]);

      if (staleCacheResult.rowCount > 0) {
        const cached = staleCacheResult.rows[0];
        const normalized = normalizeWeatherData(cached.data_json);
        console.log(`[WeatherService] Returning stale cache for site ${siteId} from ${cached.as_of}`);
        return {
          status: 'stale',
          ...normalized,
          summaryText: generateSummaryText(normalized),
          updatedAt: cached.as_of,
          fromCache: true,
          warning: 'Weather data may be outdated'
        };
      }
    } catch (cacheError) {
      console.error(`[WeatherService] Cache fallback error:`, cacheError.message);
    }

    // Return error status with more detail (BR-11-09)
    const errorDetail = httpStatus
      ? `API error ${httpStatus}: ${httpData?.message || error.message}`
      : error.message || 'Failed to fetch weather';

    return {
      status: 'error',
      error: errorDetail,
      summaryText: 'Weather information temporarily unavailable'
    };
  }
};

/**
 * Get weather forecast for a site (simplified - next 12-24 hours)
 * BR-11-07 (C-276) - short forecast
 *
 * @param {number} siteId - Site ID
 * @returns {Object} Forecast data or fallback
 */
const getForecastForSite = async (siteId) => {
  try {
    // Get site location
    const locationResult = await query(`
      SELECT sl.latitude, sl.longitude, sl.weather_location_id
      FROM site_locations sl
      WHERE sl.site_id = $1
    `, [siteId]);

    if (locationResult.rowCount === 0 || !env.weatherApiKey) {
      return {
        status: 'error',
        error: 'Location or API not configured',
        forecast: []
      };
    }

    const { latitude, longitude } = locationResult.rows[0];

    if (!latitude || !longitude) {
      return {
        status: 'error',
        error: 'Coordinates not available',
        forecast: []
      };
    }

    // Use 5-day forecast API endpoint, we'll just take next 8 entries (24 hours at 3-hour intervals)
    const baseUrl = env.weatherApiBaseUrl.replace(/\/weather\/?$/, '');
    const forecastUrl = `${baseUrl}/forecast?lat=${latitude}&lon=${longitude}&cnt=8&appid=${env.weatherApiKey}`;

    console.log(`[WeatherService] Fetching forecast for site ${siteId}`);

    const response = await axios.get(forecastUrl, {
      timeout: env.weatherTimeoutMs
    });

    const forecast = response.data.list?.map(item => ({
      time: new Date(item.dt * 1000).toISOString(),
      tempC: item.main?.temp ? Math.round(item.main.temp - 273.15) : null,
      condition: item.weather?.[0]?.main || 'Unknown',
      icon: item.weather?.[0]?.icon || null,
      precipProb: item.pop ? Math.round(item.pop * 100) : 0,
      windKph: item.wind?.speed ? Math.round(item.wind.speed * 3.6) : null
    })) || [];

    return {
      status: 'ok',
      forecast
    };
  } catch (error) {
    console.error(`[WeatherService] Forecast error for site ${siteId}:`, error.message);
    return {
      status: 'error',
      error: error.message,
      forecast: []
    };
  }
};

/**
 * Clear weather cache for a site (admin utility)
 *
 * @param {number} siteId - Site ID
 * @returns {boolean} Success status
 */
const clearCacheForSite = async (siteId) => {
  const result = await query('DELETE FROM weather_cache WHERE site_id = $1', [siteId]);
  return result.rowCount > 0;
};

module.exports = {
  getWeatherForSite,
  getForecastForSite,
  clearCacheForSite,
  normalizeWeatherData,
  generateSummaryText
};
