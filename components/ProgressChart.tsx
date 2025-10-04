import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface LineConfig {
  dataKey: string;
  stroke: string;
  name: string;
  strokeWidth?: number;
}

interface ProgressChartProps {
  data: any[];
  lines: LineConfig[];
}

const ProgressChart: React.FC<ProgressChartProps> = ({ data, lines }) => {

  if (!data || data.length < 2) {
    return (
        <div className="flex items-center justify-center h-64 bg-black/20 rounded-lg">
            <p className="text-gray-400">Not enough data to display progress. Complete at least two sessions.</p>
        </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart
        data={data}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
        <XAxis dataKey="name" stroke="#9ca3af" />
        <YAxis domain={[0, 10]} stroke="#9ca3af" />
        <Tooltip
            contentStyle={{ 
                background: 'rgba(20, 20, 20, 0.8)',
                backdropFilter: 'blur(5px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '0.75rem'
            }}
            labelStyle={{ color: '#d1d5db' }}
            itemStyle={{ fontWeight: '500' }}
        />
        <Legend wrapperStyle={{paddingTop: '20px'}} />
        {lines.map(line => (
             <Line 
                key={line.dataKey}
                type="monotone" 
                dataKey={line.dataKey} 
                stroke={line.stroke} 
                strokeWidth={line.strokeWidth || 2} 
                activeDot={{ r: 8 }} 
                name={line.name} 
                dot={{ fill: line.stroke }} 
            />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
};

export default ProgressChart;
