import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import {
  ArcElement,
  Chart as ChartJS,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

interface Slice { label: string; value: number; color: string }

export const DonutChart: React.FC<{ data: Slice[]; size?: number }> = ({ data, size = 220 }) => {
  const labels = data.map((d) => d.label);
  const values = data.map((d) => d.value);
  const colors = data.map((d) => d.color);
  const chartData: any = {
    labels,
    datasets: [
      {
        label: 'Amount',
        data: values,
        backgroundColor: colors,
        borderWidth: 0,
      },
    ],
  };

  const options: any = {
    cutout: '65%',
    plugins: {
      legend: { display: false },
    },
    responsive: true,
    maintainAspectRatio: false,
  };

  return (
    <div style={{ width: size, height: size, margin: '0 auto' }}>
      <Doughnut data={chartData} options={options} />
    </div>
  );
};
