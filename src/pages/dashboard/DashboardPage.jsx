import React from "react";
import Card from "../../components/Card";
import Table from "../../components/Table";
import Badge from "../../components/Badge";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import {
  FiTrendingUp,
  FiShoppingCart,
  FiUsers,
  FiPackage,
} from "react-icons/fi";
import { useTranslation } from "../../hooks/useTranslation";

// Mock data for charts
const salesData = [
  { name: "Jan", value: 4000 },
  { name: "Feb", value: 3000 },
  { name: "Mar", value: 5000 },
  { name: "Apr", value: 2780 },
  { name: "May", value: 1890 },
  { name: "Jun", value: 2390 },
];

const orderData = [
  { name: "Mon", value: 24 },
  { name: "Tue", value: 13 },
  { name: "Wed", value: 18 },
  { name: "Thu", value: 29 },
  { name: "Fri", value: 22 },
  { name: "Sat", value: 31 },
  { name: "Sun", value: 27 },
];

const StatCard = ({ title, value, icon: Icon, trend, t }) => (
  <div className="bg-white rounded-lg shadow p-6">
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-semibold text-gray-900 mt-2">{value}</p>
      </div>
      <div className="p-3 bg-primary-100 rounded-full ml-4 rtl:ml-0 rtl:mr-4">
        <Icon className="w-6 h-6 text-primary-600" />
      </div>
    </div>
    {trend && (
      <div className="mt-4 flex items-center text-sm">
        <span
          className={`flex items-center ${
            trend > 0 ? "text-green-600" : "text-red-600"
          }`}
        >
          <FiTrendingUp className="w-4 h-4 mr-1 rtl:mr-0 rtl:ml-1" />
          {trend}%
        </span>
        <span className="text-gray-500 ml-2 rtl:ml-0 rtl:mr-2">{t("dashboardPage.vsLastMonth")}</span>
      </div>
    )}
  </div>
);

const DashboardPage = () => {
  const { t } = useTranslation();

  const recentOrders = [
    {
      id: 1,
      customer: "John Doe",
      amount: "$120",
      status: "completed",
      date: "2024-03-20",
    },
    {
      id: 2,
      customer: "Jane Smith",
      amount: "$85",
      status: "pending",
      date: "2024-03-19",
    },
    {
      id: 3,
      customer: "Mike Johnson",
      amount: "$200",
      status: "processing",
      date: "2024-03-18",
    },
  ];

  const getStatusDisplay = (status) => {
    const statusMap = {
      completed: t("dashboardPage.completed"),
      pending: t("dashboardPage.pending"),
      processing: t("dashboardPage.processing"),
    };
    return statusMap[status] || status;
  };

  const orderColumns = [
    { key: "id", title: t("dashboardPage.orderId") },
    { key: "customer", title: t("dashboardPage.customer") },
    { key: "amount", title: t("dashboardPage.amount") },
    {
      key: "status",
      title: t("dashboardPage.status"),
      render: (row) => (
        <Badge
          variant={
            row.status === "completed"
              ? "success"
              : row.status === "pending"
              ? "warning"
              : "info"
          }
        >
          {getStatusDisplay(row.status)}
        </Badge>
      ),
    },
    { key: "date", title: t("dashboardPage.date") },
  ];

  return (
    <div className="space-y-6 rtl:space-y-reverse">
      <h1 className="text-2xl font-semibold text-gray-900">{t("dashboardPage.title")}</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title={t("dashboardPage.totalSales")}
          value="$24,500"
          icon={FiTrendingUp}
          trend={12.5}
          t={t}
        />
        <StatCard
          title={t("dashboardPage.totalOrders")}
          value="1,234"
          icon={FiShoppingCart}
          trend={8.2}
          t={t}
        />
        <StatCard
          title={t("dashboardPage.totalCustomers")}
          value="856"
          icon={FiUsers}
          trend={5.7}
          t={t}
        />
        <StatCard
          title={t("dashboardPage.totalProducts")}
          value="432"
          icon={FiPackage}
          trend={3.2}
          t={t}
        />
      </div>
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {t("dashboardPage.salesOverview")}
          </h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#0ea5e9"
                  fill="#0ea5e9"
                  fillOpacity={0.1}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Orders Chart */}
        <div className="bg-white  rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900  mb-4">
            {t("dashboardPage.dailyOrders")}
          </h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={orderData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#0ea5e9" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card title={t("dashboardPage.totalSales")} className="text-center">
          <p className="text-3xl font-bold text-blue-600">$12,345</p>
          <p className="text-sm text-gray-500">{t("dashboardPage.last30Days")}</p>
        </Card>

        <Card title={t("dashboardPage.totalOrders")} className="text-center">
          <p className="text-3xl font-bold text-green-600">156</p>
          <p className="text-sm text-gray-500">{t("dashboardPage.last30Days")}</p>
        </Card>

        <Card title={t("dashboardPage.totalCustomers")} className="text-center">
          <p className="text-3xl font-bold text-purple-600">89</p>
          <p className="text-sm text-gray-500">{t("dashboardPage.activeCustomers")}</p>
        </Card>
      </div>

      <Card title={t("dashboardPage.recentOrders")}>
        <Table
          columns={orderColumns}
          data={recentOrders}
          onRowClick={(row) => console.log("Order clicked:", row)}
        />
      </Card>
    </div>
  );
};

export default DashboardPage;
