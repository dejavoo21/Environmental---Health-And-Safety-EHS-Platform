import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell
} from 'recharts';

const DEFAULT_COLOR = '#3B82F6';
const HOVER_COLOR = '#2563EB';

const SiteComparisonChart = ({
  title,
  data = [],
  valueKey = 'incidentCount',
  labelKey = 'siteName',
  idKey = 'siteId',
  maxBars = 10,
  onBarClick,
  orientation = 'horizontal', // 'horizontal' | 'vertical'
  height = 300,
  loading = false,
  color = DEFAULT_COLOR
}) => {
  // Limit data and sort by value
  const sortedData = [...data]
    .sort((a, b) => (b[valueKey] || 0) - (a[valueKey] || 0))
    .slice(0, maxBars);

  // Calculate "Other" if there's more data
  const hasOther = data.length > maxBars;
  const otherValue = hasOther
    ? data.slice(maxBars).reduce((sum, item) => sum + (item[valueKey] || 0), 0)
    : 0;

  const chartData = hasOther && otherValue > 0
    ? [...sortedData, { [labelKey]: 'Other', [valueKey]: otherValue, [idKey]: 'other' }]
    : sortedData;

  const handleClick = (data) => {
    if (onBarClick && data && data[idKey] && data[idKey] !== 'other') {
      onBarClick(data[idKey], data);
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

  if (!chartData || chartData.length === 0) {
    return (
      <div className="chart-container">
        <h3 className="chart-title">{title}</h3>
        <div className="chart-empty" style={{ height }}>
          <span className="chart-empty-text">No data available</span>
        </div>
      </div>
    );
  }

  const isHorizontal = orientation === 'horizontal';

  return (
    <div className="chart-container">
      <h3 className="chart-title">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={chartData}
          layout={isHorizontal ? 'vertical' : 'horizontal'}
          margin={{ top: 10, right: 30, left: isHorizontal ? 100 : 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />

          {isHorizontal ? (
            <>
              <XAxis
                type="number"
                tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
                stroke="var(--color-border-subtle)"
              />
              <YAxis
                type="category"
                dataKey={labelKey}
                tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
                stroke="var(--color-border-subtle)"
                width={90}
              />
            </>
          ) : (
            <>
              <XAxis
                type="category"
                dataKey={labelKey}
                tick={{ fontSize: 12, angle: -45, fill: 'var(--color-text-muted)' }}
                textAnchor="end"
                stroke="var(--color-border-subtle)"
                height={60}
              />
              <YAxis
                type="number"
                tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
                stroke="var(--color-border-subtle)"
              />
            </>
          )}

          <Tooltip
            formatter={(value) => [value, 'Count']}
            contentStyle={{
              backgroundColor: 'var(--color-bg-card)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: '6px',
              color: 'var(--color-text-strong)'
            }}
          />

          <Bar
            dataKey={valueKey}
            onClick={(data) => handleClick(data)}
            cursor={onBarClick ? 'pointer' : 'default'}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry[idKey] === 'other' ? 'var(--color-text-muted)' : color}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SiteComparisonChart;
