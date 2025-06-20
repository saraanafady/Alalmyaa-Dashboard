import React, { useState, useMemo } from "react";
import { FiEye, FiDownload, FiFilter, FiX } from "react-icons/fi";
import toast from "react-hot-toast";
import axios from "axios";
import { base_url } from "../../constants/axiosConfig";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  processing: "bg-blue-100 text-blue-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const paymentStatusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  paid: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
};

const OrdersPage = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("");
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  // Function to safely format currency
  const formatCurrency = (amount) => {
    const num = Number(amount);
    return isNaN(num) ? "0.00" : num.toFixed(2);
  };

  // Function to generate a readable order name
  const getOrderName = (order) => {
    const date = new Date(order.createdAt);
    const formattedDate = date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    return `Order #${order._id.slice(-6)} - ${formattedDate}`;
  };

  // Fetch orders from the API
  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${base_url}/api/orders`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      // Check if response has the expected structure
      if (
        !response.data ||
        !response.data.data ||
        !Array.isArray(response.data.data.orders)
      ) {
        console.error("Unexpected API response structure:", response.data);
        return { orders: [], total: 0 };
      }

      // Fetch user details for each order
      const ordersWithUserDetails = await Promise.all(
        response.data.data.orders.map(async (order) => {
          try {
            console.log("Raw order from API:", order);
            // Only fetch if user is a string (ID), otherwise assume it's already populated
            if (order.user && typeof order.user === "string") {
              const userResponse = await axios.get(
                `${base_url}/api/users/${order.user}`,
                {
                  headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                  },
                }
              );
              console.log("User fetch response:", userResponse.data);
              if (userResponse.data && userResponse.data.data) {
                const userData =
                  userResponse.data.data.user || userResponse.data.data;
                const mergedOrder = {
                  ...order,
                  user: userData,
                };
                console.log("Order after merging user:", mergedOrder);
                return mergedOrder;
              }
            }
            // Log the user data for debugging
            console.log("Order user data (no fetch):", order.user);
            return order;
          } catch (error) {
            console.error(
              `Error fetching user details for order ${order._id}:`,
              error
            );
            return order;
          }
        })
      );

      return {
        orders: ordersWithUserDetails,
        total: response.data.results || ordersWithUserDetails.length,
      };
    } catch (error) {
      console.error("Error fetching orders:", error);
      return { orders: [], total: 0 };
    }
  };

  const {
    data: ordersData = { orders: [], total: 0 },
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["orders"],
    queryFn: fetchOrders,
    retry: 3,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Update order status mutation
  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }) => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          throw new Error("No authentication token found");
        }

        // Check if user exists and has admin role
        if (!user) {
          throw new Error("User not authenticated");
        }

        if (user.role !== "admin") {
          throw new Error("Only administrators can update order status");
        }

        console.log("Updating order status - Request details:", {
          url: `${base_url}/api/orders/${orderId}/status`,
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          data: { status },
          user: {
            id: user.id,
            role: user.role,
            email: user.email,
          },
        });

        const response = await axios.put(
          `${base_url}/api/orders/${orderId}/status`,
          { status },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        console.log("Status update response:", response.data);
        return response.data;
      } catch (error) {
        console.error("Error updating order status:", {
          error: error.response?.data || error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
          headers: error.response?.headers,
          user: user
            ? {
                id: user.id,
                role: user.role,
                email: user.email,
              }
            : "No user found",
          requestData: { orderId, status },
        });

        if (error.response?.status === 401) {
          throw new Error("Your session has expired. Please log in again.");
        } else if (error.response?.status === 403) {
          throw new Error("You don't have permission to update order status");
        } else if (error.response?.status === 500) {
          console.error("Server error details:", error.response?.data);
          throw new Error(
            error.response?.data?.message ||
              "Server error while updating order status. Please try again."
          );
        } else {
          throw new Error(
            error.response?.data?.message || "Failed to update order status"
          );
        }
      }
    },
    onSuccess: (data) => {
      console.log("Status update successful:", data);
      toast.success("Order status updated successfully");
      queryClient.invalidateQueries(["orders"]);
    },
    onError: (error) => {
      console.error("Mutation error:", error);
      toast.error(error.message || "Failed to update order status");
      if (
        error.message.includes("session has expired") ||
        error.message.includes("not authenticated")
      ) {
        navigate("/login");
      }
    },
  });

  const handleStatusChange = (orderId, newStatus) => {
    // Check if user exists and has admin role
    if (!user) {
      toast.error("Please log in to update order status");
      navigate("/login");
      return;
    }

    if (user.role !== "admin") {
      toast.error("Only administrators can update order status");
      return;
    }

    // Validate status before sending
    const validStatuses = [
      "pending",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ];
    if (!validStatuses.includes(newStatus)) {
      toast.error("Invalid order status");
      return;
    }

    setUpdatingOrderId(orderId);
    updateOrderStatusMutation.mutate(
      { orderId, status: newStatus },
      {
        onSettled: () => setUpdatingOrderId(null),
      }
    );
  };

  const handleExport = (orderId) => {
    toast.info("Export functionality coming soon!");
  };

  // Optimize filtering with useMemo
  const filteredOrders = useMemo(() => {
    if (!ordersData?.orders) return [];

    return ordersData.orders.filter((order) => {
      const fullName = `${order.user?.firstName || ""} ${
        order.user?.lastName || ""
      }`.toLowerCase();
      const matchesSearch =
        fullName.includes(searchTerm.toLowerCase()) ||
        order.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getOrderName(order).toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter ? order.status === statusFilter : true;
      const matchesPaymentStatus = paymentStatusFilter
        ? order.paymentStatus === paymentStatusFilter
        : true;
      return matchesSearch && matchesStatus && matchesPaymentStatus;
    });
  }, [ordersData?.orders, searchTerm, statusFilter, paymentStatusFilter]);

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[60vh] space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        <span className="text-gray-600 text-lg">Loading orders...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Error loading orders: {error?.message}</p>
        <button
          onClick={() => queryClient.invalidateQueries(["orders"])}
          className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Orders</h1>
        <div className="flex space-x-4">
          <button
            onClick={() => handleExport("all")}
            className="inline-flex items-center px-4 py-2 border bg-white border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
            disabled
          >
            <FiDownload className="w-5 h-5 mr-2" />
            Export All (Coming Soon)
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex space-x-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by customer name, email, or order..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border bg-white border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select
          value={paymentStatusFilter}
          onChange={(e) => setPaymentStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
        >
          <option value="">All Payment Status</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Orders Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.map((order) => (
                <tr key={order._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {getOrderName(order)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0">
                        <img
                          className="h-10 w-10 rounded-full object-cover"
                          src={
                            order.user?.profilePicture ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(
                              `${order.user?.firstName || ""} ${
                                order.user?.lastName || ""
                              }`
                            )}`
                          }
                          alt={`${order.user?.firstName} ${order.user?.lastName}`}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                              `${order.user?.firstName || ""} ${
                                order.user?.lastName || ""
                              }`
                            )}`;
                          }}
                        />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {order.user?.firstName || "N/A"}{" "}
                          {order.user?.lastName || "N/A"}
                        </div>
                        <div className="text-sm text-gray-500">
                          {order.user?.email || "N/A"}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {order.user?.phoneNumber || "N/A"}
                    </div>
                    <div className="text-sm text-gray-500">
                      {order.user?.address || "No address"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {order.user?.createdAt
                        ? new Date(order.user.createdAt).toLocaleDateString()
                        : "N/A"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      ${formatCurrency(order.totalOrderPrice)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={order.status || "pending"}
                      onChange={(e) =>
                        handleStatusChange(order._id, e.target.value)
                      }
                      disabled={
                        updatingOrderId === order._id ||
                        !user ||
                        user.role !== "admin"
                      }
                      className={`text-sm rounded-full px-2 py-1 font-semibold ${
                        statusColors[order.status] || statusColors.pending
                      } ${
                        updatingOrderId === order._id ||
                        !user ||
                        user.role !== "admin"
                          ? "opacity-50 cursor-not-allowed"
                          : ""
                      }`}
                    >
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    {updatingOrderId === order._id && (
                      <div className="text-xs text-gray-500 mt-1">
                        Updating...
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div
                      className={`text-sm rounded-full px-2 py-1 font-semibold ${
                        paymentStatusColors[order.paymentStatus] ||
                        paymentStatusColors.pending
                      }`}
                    >
                      {order.paymentStatus}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {order.paymentMethod}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => {
                        setSelectedOrder(order);
                        setIsModalOpen(true);
                      }}
                      className="text-primary-600 hover:text-primary-900 mr-4"
                    >
                      <FiEye className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleExport(order._id)}
                      className="text-gray-600 hover:text-gray-900"
                      disabled
                      title="Export functionality coming soon"
                    >
                      <FiDownload className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details Modal */}
      {isModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {getOrderName(selectedOrder)}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Customer: {selectedOrder.user?.firstName || "N/A"}{" "}
                  {selectedOrder.user?.lastName || "N/A"}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Customer Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-500 mb-3">
                  Customer Information
                </h3>
                <div className="flex items-start space-x-4">
                  <img
                    src={
                      selectedOrder.user?.profilePicture ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        `${selectedOrder.user?.firstName || ""} ${
                          selectedOrder.user?.lastName || ""
                        }`
                      )}`
                    }
                    alt={`${selectedOrder.user?.firstName} ${selectedOrder.user?.lastName}`}
                    className="h-20 w-20 rounded-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        `${selectedOrder.user?.firstName || ""} ${
                          selectedOrder.user?.lastName || ""
                        }`
                      )}`;
                    }}
                  />
                  <div className="flex-1">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Name: {selectedOrder.user?.firstName || "N/A"}{" "}
                          {selectedOrder.user?.lastName || "N/A"}
                        </p>
                        <p className="text-sm text-gray-500">
                          Email: {selectedOrder.user?.email || "N/A"}
                        </p>
                        <p className="text-sm text-gray-500">
                          Phone: {selectedOrder.user?.phoneNumber || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">
                          Member Since:{" "}
                          {selectedOrder.user?.createdAt
                            ? new Date(
                                selectedOrder.user.createdAt
                              ).toLocaleDateString()
                            : "N/A"}
                        </p>
                        <p className="text-sm text-gray-500">
                          Total Orders: {selectedOrder.user?.ordersCount || 0}
                        </p>
                        <p className="text-sm text-gray-500">
                          Total Spent: $
                          {formatCurrency(selectedOrder.user?.totalSpent)}
                        </p>
                      </div>
                    </div>
                    {selectedOrder.user?.address && (
                      <p className="text-sm text-gray-500 mt-2">
                        Address: {selectedOrder.user.address || "No address"}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Order Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    Payment Information
                  </h3>
                  <p className="mt-1 text-sm text-gray-900">
                    Method: {selectedOrder.paymentMethod || "N/A"}
                  </p>
                  <p className="text-sm text-gray-500">
                    Status: {selectedOrder.paymentStatus || "N/A"}
                  </p>
                  <p className="text-sm text-gray-500">
                    Paid: {selectedOrder.isPaid ? "Yes" : "No"}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    Delivery Information
                  </h3>
                  <p className="mt-1 text-sm text-gray-900">
                    Status: {selectedOrder.status || "N/A"}
                  </p>
                  <p className="text-sm text-gray-500">
                    Delivered: {selectedOrder.isDelivered ? "Yes" : "No"}
                  </p>
                  {selectedOrder.deliveredAt && (
                    <p className="text-sm text-gray-500">
                      Delivered At:{" "}
                      {selectedOrder.deliveredAt
                        ? new Date(
                            selectedOrder.deliveredAt
                          ).toLocaleDateString()
                        : "N/A"}
                    </p>
                  )}
                </div>
              </div>

              {/* Shipping Address */}
              {selectedOrder.shippingAddress && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">
                    Shipping Address
                  </h3>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <p className="text-sm text-gray-900">
                      {selectedOrder.shippingAddress.address || "N/A"}
                    </p>
                    <p className="text-sm text-gray-900">
                      {selectedOrder.shippingAddress.city},{" "}
                      {selectedOrder.shippingAddress.postalCode}
                    </p>
                    <p className="text-sm text-gray-900">
                      {selectedOrder.shippingAddress.country || "N/A"}
                    </p>
                  </div>
                </div>
              )}

              {/* Order Items */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  Items
                </h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                          Item
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                          Quantity
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                          Price
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedOrder.cartItems?.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {item.product?.name || "N/A"}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-500">
                            {item.quantity}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-500">
                            ${formatCurrency(item.price)}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            ${formatCurrency(item.quantity * item.price)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td
                          colSpan="3"
                          className="px-4 py-2 text-sm font-medium text-gray-900 text-right"
                        >
                          Total
                        </td>
                        <td className="px-4 py-2 text-sm font-medium text-gray-900">
                          ${formatCurrency(selectedOrder.totalOrderPrice)}
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
