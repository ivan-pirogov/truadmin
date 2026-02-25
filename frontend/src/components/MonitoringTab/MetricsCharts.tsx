import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface MetricsHistory {
  time: string;
  activeQueries: number;
  locks: number;
  deadlocks: number;
  longQueries: number;
}

interface MetricsChartsProps {
  metricsHistory: MetricsHistory[];
  showOnlyActive: boolean;
  showSystemLocks: boolean;
  longQueryThreshold: number;
  formatThreshold: (ms: number) => string;
}

const MetricsCharts: React.FC<MetricsChartsProps> = ({
  metricsHistory,
  showOnlyActive,
  showSystemLocks,
  longQueryThreshold,
  formatThreshold,
}) => {
  if (metricsHistory.length === 0) return null;

  return (
    <div className="metrics-charts">
      {/* Active Queries Chart */}
      <div className="chart-container">
        <h3 className="chart-title">
          Active Queries{showOnlyActive ? ' (Only Active)' : ''}
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={metricsHistory}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="time"
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '12px'
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: '12px' }}
            />
            <Line
              type="monotone"
              dataKey="activeQueries"
              stroke="#3b82f6"
              strokeWidth={2}
              name="Active Queries"
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Locks and Deadlocks Chart */}
      <div className="chart-container">
        <h3 className="chart-title">
          Locks and Deadlocks{showSystemLocks ? ' (Show System)' : ''}
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={metricsHistory}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="time"
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '12px'
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: '12px' }}
            />
            <Line
              type="monotone"
              dataKey="locks"
              stroke="#f59e0b"
              strokeWidth={2}
              name="Locks"
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="deadlocks"
              stroke="#ef4444"
              strokeWidth={2}
              name="Deadlocks"
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Long Running Queries Chart */}
      <div className="chart-container">
        <h3 className="chart-title">
          Long Running Queries ({formatThreshold(longQueryThreshold)})
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={metricsHistory}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="time"
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '12px'
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: '12px' }}
            />
            <Line
              type="monotone"
              dataKey="longQueries"
              stroke="#8b5cf6"
              strokeWidth={2}
              name="Long Queries"
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MetricsCharts;
