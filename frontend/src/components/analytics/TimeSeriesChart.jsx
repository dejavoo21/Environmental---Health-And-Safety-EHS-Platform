import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

const SEVERITY_COLORS = {
  critical: '#DC2626',
  high: '#F97316',
  medium: '#FBBF24',
  low: '#22C55E'
};

const DEFAULT_COLORS = [
  '#3B82F6', // blue
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#14B8A6', // teal
  '#F59E0B'  // amber
];

const formatPeriod = (period) => {
  if (!period) return '';
  const date = new Date(period);
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
};

const TimeSeriesChart = ({
  title,
  data = [],
  type = 'stacked-bar', // 'stacked-bar' | 'line' | 'grouped-bar'
  series = [],
  xAxisKey = 'period',
  height = 300,
  onDataClick,
  loading = false,
  showLegend = true
}) => {
  // Transform data for severity breakdown
  const transformedData = data.map(item => {
    if (item.data && typeof item.data === 'object') {
      return {
        period: item.period,
        ...item.data
      };
    }
    return item;
  });

  // Auto-detect series from data if not provided
  const detectedSeries = series.length > 0 ? series : (() => {
    if (transformedData.length === 0) return [];

    const firstItem = transformedData[0];
    const keys = Object.keys(firstItem).filter(k => k !== 'period' && k !== xAxisKey);

    return keys.map((key, index) => ({
      key,
      label: key.charAt(0).toUpperCase() + key.slice(1),
      color: SEVERITY_COLORS[key] || DEFAULT_COLORS[index % DEFAULT_COLORS.length]
    }));
  })();

  const handleBarClick = (data, index, e) => {
    if (onDataClick && data) {
      onDataClick({
        period: data.period,
        ...data
      });
    }
  };

  if (loading) {
    return (
      <div className="chart-container">
        <h3 className="chart-title">{title}</h3>
        <div className="chart-loading" style={{ height }}>
          <span className="chart-loading-text">Loading chart...</span>
        </div>
      </div>
    );
  }

  if (!transformedData || transformedData.length === 0) {
    return (
      <div className="chart-container">
        <h3 className="chart-title">{title}</h3>
        <div className="chart-empty" style={{ height }}>
          <span className="chart-empty-text">No data available</span>
        </div>
      </div>
    );
  }

  const renderBars = () => {
    return detectedSeries.map((s, index) => (
      <Bar
        key={s.key}
        dataKey={s.key}
        name={s.label}
        fill={s.color}
        stackId={type === 'stacked-bar' ? 'stack' : undefined}
        onClick={handleBarClick}
        cursor={onDataClick ? 'pointer' : 'default'}
      />
    ));
  };

  const renderLines = () => {
    return detectedSeries.map((s, index) => (
      <Line
        key={s.key}
        type="monotone"
        dataKey={s.key}
        name={s.label}
        stroke={s.color}
        strokeWidth={2}
        dot={{ r: 4 }}
        activeDot={{ r: 6, onClick: handleBarClick, cursor: onDataClick ? 'pointer' : 'default' }}
      />
    ));
  };

  return (
    <div className="chart-container">
      <h3 className="chart-title">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={transformedData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
          <XAxis
            dataKey={xAxisKey}
            tickFormatter={formatPeriod}
            tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
            stroke="var(--color-border-subtle)"
          />
          <YAxis
            tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
            stroke="var(--color-border-subtle)"
            allowDecimals={false}
          />
          <Tooltip
            formatter={(value, name) => [value, name]}
            labelFormatter={formatPeriod}
            contentStyle={{
              backgroundColor: 'var(--color-bg-card)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: '6px',
              color: 'var(--color-text-strong)'
            }}
          />
          {showLegend && (
            <Legend
              wrapperStyle={{ paddingTop: '10px' }}
              formatter={(value) => <span style={{ color: 'var(--color-text-strong)' }}>{value}</span>}
            />
          )}
          {type === 'line' ? renderLines() : renderBars()}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TimeSeriesChart;
