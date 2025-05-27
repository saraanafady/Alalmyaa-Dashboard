import React, { useState } from "react";
import Card from "../../components/Card";
import Table from "../../components/Table";
import Button from "../../components/Button";
import Modal from "../../components/Modal";
import Badge from "../../components/Badge";
import { FiEye, FiDownload, FiFilter } from "react-icons/fi";
import toast from "react-hot-toast";

// Mock data
const initialOrders = [
  {
    id: "ORD-001",
    customer: {
      name: "John Doe",
      email: "john@example.com",
    },
    date: "2024-03-15",
    total: 149.99,
    status: "Delivered",
    items: [
      { name: "Product 1", quantity: 2, price: 49.99 },
      { name: "Product 2", quantity: 1, price: 49.99 },
    ],
  },
  {
    id: "ORD-002",
    customer: {
      name: "Jane Smith",
      email: "jane@example.com",
    },
    date: "2024-03-14",
    total: 299.99,
    status: "Processing",
    items: [{ name: "Product 3", quantity: 1, price: 299.99 }],
  },
];

const statusColors = {
  Pending: "bg-yellow-100 text-yellow-800 ",
  Processing: "bg-blue-100 text-blue-800 ",
  Shipped: "bg-purple-100 text-purple-800 ",
  Delivered: "bg-green-100 text-green-800 ",
  Cancelled: "bg-red-100 text-red-800 ",
};

const OrdersPage = () => {
  const [orders, setOrders] = useState(initialOrders);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter ? order.status === statusFilter : true;

    return matchesSearch && matchesStatus;
  });

  const handleStatusChange = (orderId, newStatus) => {
    setOrders(
      orders.map((order) =>
        order.id === orderId ? { ...order, status: newStatus } : order
      )
    );
    toast.success("Order status updated successfully");
  };

  const handleExport = (orderId) => {
    // TODO: Implement PDF/CSV export
    toast.success("Order exported successfully");
  };

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const columns = [
    { key: "id", title: "Order ID" },
    { key: "customer", title: "Customer" },
    { key: "date", title: "Date" },
    { key: "total", title: "Total" },
    {
      key: "status",
      title: "Status",
      render: (row) => (
        <Badge
          variant={
            row.status === "completed"
              ? "success"
              : row.status === "processing"
              ? "info"
              : "warning"
          }
        >
          {row.status}
        </Badge>
      ),
    },
    { key: "items", title: "Items" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900 ">Orders</h1>
        <div className="flex space-x-4">
          <button
            onClick={() => handleExport("all")}
            className="inline-flex items-center px-4 py-2 border bg-white border-gray-300  rounded-md shadow-sm text-sm font-medium text-gray-700  hover:bg-gray-50 "
          >
            <FiDownload className="w-5 h-5 mr-2" />
            Export All
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex space-x-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border bg-white border-gray-300  rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500  "
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500  "
        >
          <option value="">All Status</option>
          <option value="Pending">Pending</option>
          <option value="Processing">Processing</option>
          <option value="Shipped">Shipped</option>
          <option value="Delivered">Delivered</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      {/* Orders Table */}
      <div className="bg-white  shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 ">
          <thead className="bg-gray-50 ">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500  uppercase tracking-wider">
                Order ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500  uppercase tracking-wider">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500  uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500  uppercase tracking-wider">
                Total
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500  uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500  uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white  divide-y divide-gray-200 ">
            {filteredOrders.map((order) => (
              <tr key={order.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900 ">
                    {order.id}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 ">
                    {order.customer.name}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {order.customer.email}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500 ">{order.date}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 ">${order.total}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <select
                    value={order.status}
                    onChange={(e) =>
                      handleStatusChange(order.id, e.target.value)
                    }
                    className={`text-sm rounded-full px-2 py-1 font-semibold ${
                      statusColors[order.status]
                    }`}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Processing">Processing</option>
                    <option value="Shipped">Shipped</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => {
                      setSelectedOrder(order);
                      setIsModalOpen(true);
                    }}
                    className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300 mr-4"
                  >
                    <FiEye className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleExport(order.id)}
                    className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300"
                  >
                    <FiDownload className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Order Details Modal */}
      {isModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white  rounded-lg p-6 max-w-2xl w-full">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-lg font-semibold text-gray-900 ">
                Order Details - {selectedOrder.id}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Customer
                  </h3>
                  <p className="mt-1 text-sm text-gray-900 ">
                    {selectedOrder.customer.name}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedOrder.customer.email}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Order Date
                  </h3>
                  <p className="mt-1 text-sm text-gray-900 ">
                    {selectedOrder.date}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Items
                </h3>
                <div className="border border-gray-200  rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200 ">
                    <thead className="bg-gray-50 ">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 ">
                          Item
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 ">
                          Quantity
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 ">
                          Price
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 ">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 ">
                      {selectedOrder.items.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm text-gray-900 ">
                            {item.name}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                            {item.quantity}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                            ${item.price}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900 ">
                            ${(item.quantity * item.price).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 ">
                      <tr>
                        <td
                          colSpan="3"
                          className="px-4 py-2 text-sm font-medium text-gray-900  text-right"
                        >
                          Total
                        </td>
                        <td className="px-4 py-2 text-sm font-medium text-gray-900 ">
                          ${selectedOrder.total}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersPage;
