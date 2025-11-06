// File: src/pages/admin/AdminStats.jsx

import React, { useState, useEffect } from "react";
// === 1. IMPORT THÊM API VÀ BIỂU ĐỒ ===
import {
  getOverviewStats,
  getMessageActivityStats, // 👈 THÊM MỚI
  getUserGrowthStats, // 👈 THÊM MỚI
} from "../../api/adminApi"; // (Kiểm tra lại đường dẫn này nhé)
import {
  UsersIcon,
  ChatBubbleLeftRightIcon,
  RectangleStackIcon,
  UserPlusIcon,
  SunIcon,
  MoonIcon,
} from "@heroicons/react/24/outline";

// Import Chart.js và các component
import { Line, Pie, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

// Đăng ký các thành phần Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);
// === KẾT THÚC IMPORT ===

// Component con cho Thẻ số liệu (Giữ nguyên)
const StatCard = ({ title, value, icon, color }) => {
  const Icon = icon;
  return (
    <div
      className={`bg-gray-800 p-6 rounded-2xl shadow-lg border-l-4 ${color}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-400 uppercase">
            {title}
          </p>
          <p className="text-3xl font-bold text-white">{value}</p>
        </div>
        <div className="p-3 bg-gray-700 rounded-full">
          <Icon className="w-8 h-8 text-white" />
        </div>
      </div>
    </div>
  );
};

// === 2. THÊM STATE VÀ CẬP NHẬT useEffect ===
const AdminStats = () => {
  const [overview, setOverview] = useState(null);
  const [messageStats, setMessageStats] = useState(null); // 👈 THÊM MỚI
  const [userGrowth, setUserGrowth] = useState(null); // 👈 THÊM MỚI
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Gọi TẤT CẢ API khi component mount
  useEffect(() => {
    const fetchAllStats = async () => {
      try {
        setLoading(true);
        
        // Gọi cả 3 API song song để tăng tốc
        const [overviewData, messageData, growthData] = await Promise.all([
          getOverviewStats(),
          getMessageActivityStats(),
          getUserGrowthStats(),
        ]);

        setOverview(overviewData);
        setMessageStats(messageData);
        setUserGrowth(growthData);
        setError(null);

      } catch (err) {
        console.error("Lỗi khi tải thống kê:", err);
        setError("Không thể tải dữ liệu thống kê. Vui lòng thử lại.");
        if (err.response?.status === 403 || err.response?.status === 401) {
          setError("Bạn không có quyền hoặc phiên đã hết hạn. Vui lòng đăng nhập lại.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAllStats();
  }, []);
  // === KẾT THÚC CẬP NHẬT ===

  // Tính tỷ lệ DAU/MAU (Giữ nguyên)
  const stickiness = overview?.mau > 0
    ? ((overview.dau / overview.mau) * 100).toFixed(1)
    : 0;

  if (loading) {
    return <div className="p-8 text-white">Đang tải dữ liệu thống kê...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-400">{error}</div>;
  }

  // Chờ tất cả data về
  if (!overview || !messageStats || !userGrowth) {
    return <div className="p-8 text-white">Không có dữ liệu.</div>;
  }

  // === 3. CHUẨN BỊ DỮ LIỆU CHO BIỂU ĐỒ ===

  // Dữ liệu cho biểu đồ đường (Line Chart) - Người dùng mới
  const userGrowthData = {
    labels: userGrowth.map((d) => d.id), // ["2025-10-30", "2025-10-31", ...]
    datasets: [
      {
        label: "Người dùng mới",
        data: userGrowth.map((d) => d.count), // [2, 1, ...]
        fill: true,
        backgroundColor: "rgba(168, 85, 247, 0.2)", // Màu tím mờ
        borderColor: "rgb(168, 85, 247)", // Màu tím
        tension: 0.1,
      },
    ],
  };

  // Dữ liệu cho biểu đồ tròn (Pie Chart) - Loại tin nhắn
  const messageTypeData = {
    labels: messageStats.byType.map((d) => d.id), // ["Text", "File", "Voice"]
    datasets: [
      {
        label: "Số lượng",
        data: messageStats.byType.map((d) => d.count), // [67, 4, 4]
        backgroundColor: [
          "rgba(168, 85, 247, 0.8)", // Tím
          "rgba(59, 130, 246, 0.8)", // Xanh dương
          "rgba(34, 197, 94, 0.8)",  // Xanh lá
          "rgba(234, 179, 8, 0.8)",  // Vàng
        ],
        borderColor: "#4B5563", // Màu nền gray-600
        borderWidth: 1,
      },
    ],
  };

  // Dữ liệu cho biểu đồ cột (Bar Chart) - Giờ cao điểm
  // Ta cần tạo 1 mảng 24 phần tử (0h -> 23h)
  const hours = Array.from({ length: 24 }, (_, i) => `${i}h`); // ["0h", "1h", ...]
  const hourData = new Array(24).fill(0); // [0, 0, 0, ...]
  
  // Lấy map từ API: (ví dụ: { "0": 5, "2": 7, ... })
  const apiHourMap = new Map(messageStats.byHour.map(d => [d.id, d.count]));
  
  // Điền dữ liệu từ API vào mảng 24h
  for (let i = 0; i < 24; i++) {
    if (apiHourMap.has(i)) {
      hourData[i] = apiHourMap.get(i);
    }
  }

  const peakHourData = {
    labels: hours,
    datasets: [
      {
        label: "Số tin nhắn",
        data: hourData,
        backgroundColor: "rgba(168, 85, 247, 0.5)", // Màu tím
        borderColor: "rgb(168, 85, 247)",
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: "#D1D5DB" // Màu text (gray-300)
        }
      }
    },
    scales: { // Chỉ dùng cho Line và Bar
      y: {
        ticks: { color: "#9CA3AF" }, // Màu số (gray-400)
        grid: { color: "#374151" }  // Màu lưới (gray-700)
      },
      x: {
        ticks: { color: "#9CA3AF" },
        grid: { color: "#374151" }
      }
    }
  };

  // === KẾT THÚC CHUẨN BỊ DỮ LIỆU ===


  return (
    <div className="p-8 text-white bg-gray-900 min-h-full">
      <h1 className="text-3xl font-bold text-purple-300 mb-6">
        Bảng điều khiển Thống kê
      </h1>

      {/* Hàng 1: Các Thẻ KPI (Giữ nguyên) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Tổng người dùng"
          value={overview.totalUsers}
          icon={UsersIcon}
          color="border-purple-500"
        />
        <StatCard
          title="Tổng tin nhắn"
          value={overview.totalMessages}
          icon={ChatBubbleLeftRightIcon}
          color="border-blue-500"
        />
        <StatCard
          title="Tổng kênh chat"
          value={overview.totalChannels}
          icon={RectangleStackIcon}
          color="border-green-500"
        />
        <StatCard
          title="User hoạt động (DAU)"
          value={overview.dau}
          icon={SunIcon}
          color="border-yellow-500"
        />
        <StatCard
          title="User hoạt động (MAU)"
          value={overview.mau}
          icon={MoonIcon}
          color="border-indigo-500"
        />
        <StatCard
          title="Tỷ lệ 'dính' (DAU/MAU)"
          value={`${stickiness}%`}
          icon={UserPlusIcon}
          color="border-pink-500"
        />
      </div>

      {/* === 4. THAY THẾ CHỖ TRỐNG BẰNG BIỂU ĐỒ === */}
      <div className="mt-8">
        <h2 className="text-2xl font-semibold text-purple-300 mb-4">
          Phân tích Hoạt động
        </h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Biểu đồ đường */}
          <div className="lg:col-span-2 p-6 bg-gray-800 rounded-2xl shadow-lg h-96">
            <h3 className="font-semibold mb-4">Người dùng mới theo ngày</h3>
            <Line options={chartOptions} data={userGrowthData} />
          </div>
          
          {/* Biểu đồ tròn */}
          <div className="p-6 bg-gray-800 rounded-2xl shadow-lg h-96">
            <h3 className="font-semibold mb-4">Loại tin nhắn</h3>
            <Pie 
              data={messageTypeData} 
              options={{ 
                responsive: true, 
                maintainAspectRatio: false,
                plugins: { legend: { labels: { color: "#D1D5DB" } } }
              }} 
            />
          </div>
        </div>
        
        {/* Biểu đồ cột */}
        <div className="mt-6 p-6 bg-gray-800 rounded-2xl shadow-lg h-96">
          <h3 className="font-semibold mb-4">Giờ cao điểm (Theo giờ VN)</h3>
          <Bar options={chartOptions} data={peakHourData} />
        </div>
      </div>
    </div>
  );
};

export default AdminStats;