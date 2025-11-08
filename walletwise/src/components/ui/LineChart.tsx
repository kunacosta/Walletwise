import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
);

export const LineChart: React.FC<{ labels: string[]; values: number[]; height?: number }>
  = ({ labels, values, height = 200 }) => {
  const data: any = {
    labels,
    datasets: [
      {
        label: 'Spend',
        data: values,
        borderColor: 'rgba(56, 128, 255, 1)', // ion-color-primary
        backgroundColor: 'rgba(56, 128, 255, 0.15)',
        fill: true,
        tension: 0.35,
        pointRadius: 3,
      },
    ],
  };

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false } },
      y: { grid: { color: 'rgba(0,0,0,0.05)' } },
    },
  };

  return <div style={{ height }}><Line data={data} options={options} /></div>;
};
