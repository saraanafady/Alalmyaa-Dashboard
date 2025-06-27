import React, { useState } from "react";
import Card from "../../components/Card";
import Table from "../../components/Table";
import Button from "../../components/Button";
import Modal from "../../components/Modal";
import Badge from "../../components/Badge";
import { FiEye, FiDownload } from "react-icons/fi";
import toast from "react-hot-toast";
import { base_url } from "../../constants/axiosConfig";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import Input from "../../components/Input";
import axios from "axios";
import { useTranslation } from "../../hooks/useTranslation";
import jsPDF from "jspdf";

// Function to get localized text from database objects
const getLocalizedText = (obj, lang, fallback = "") => {
  if (!obj) return fallback;
  if (typeof obj === "string") return obj;
  if (typeof obj === "object" && obj !== null) {
    if (obj[lang] && typeof obj[lang] === "string" && obj[lang].trim())
      return obj[lang].trim();
    if (obj.en && typeof obj.en === "string" && obj.en.trim())
      return obj.en.trim();
    if (obj.ar && typeof obj.ar === "string" && obj.ar.trim())
      return obj.ar.trim();
  }
  return fallback;
};

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
  const { t } = useTranslation();
  const { user: adminUser } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("");
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  // Get current language
  const currentLang = localStorage.getItem("language") || "en";

  // Fetch orders using React Query
  const { data: orders = [], isLoading: ordersLoading, error: ordersError } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      try {
        console.log("🚀 Fetching orders from:", `${base_url}/api/orders/admin`);
        const response = await axios.get(`${base_url}/api/orders/admin`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        console.log("✅ Orders API Response:", response.data);
        console.log("📊 Orders data structure:", response.data.data);
        return response.data.data.orders || response.data.data || response.data;
      } catch (error) {
        console.error("❌ Orders fetch error:", error.response?.data);
        throw error;
      }
    },
    retry: false,
  });

  // Mutation for updating order status
  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }) => {
      if (!adminUser || adminUser.role !== "admin") {
        throw new Error(t("ordersPage.adminOnly"));
      }
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          throw new Error("No authentication token found");
        }

        // Prepare the update payload
        const updatePayload = { status };
        
        // Auto-update payment status based on order status
        if (status === "delivered") {
          // When order is delivered, automatically mark payment as paid
          updatePayload.paymentStatus = "paid";
          console.log("🚚 Delivered status detected - setting paymentStatus to 'paid'");
        } else if (status === "cancelled") {
          // Smart logic for cancelled orders based on current payment status
          // We need to get the current order to check its payment status
          const currentOrder = orders.find(order => order._id === orderId);
          console.log("❌ Cancelled status detected - current order:", currentOrder);
          if (currentOrder) {
            console.log("💳 Current payment status:", currentOrder.paymentStatus);
            if (currentOrder.paymentStatus === "pending") {
              // If payment was pending, mark as failed since order is cancelled
              updatePayload.paymentStatus = "failed";
              console.log("⚠️ Setting paymentStatus to 'failed' (was pending)");
            } else {
              console.log("💰 Keeping paymentStatus as is (was already paid)");
            }
            // If payment was already "paid", keep it as "paid" 
            // (requires manual refund process - don't auto-change)
          }
        }

        console.log("🔄 Updating order with payload:", updatePayload);
        console.log("📍 API URL:", `${base_url}/api/orders/${orderId}/status`);
        console.log("🎯 Order ID:", orderId);

        // Try the status update first
        const response = await axios.patch(
          `${base_url}/api/orders/${orderId}/status`,
          updatePayload,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        console.log("✅ Backend response:", response.data);
        
        // If the backend route doesn't handle paymentStatus, try a direct update
        if (updatePayload.paymentStatus && updatePayload.paymentStatus !== status) {
          console.log("🔄 Attempting direct order update for payment status...");
          try {
            const directUpdateResponse = await axios.patch(
              `${base_url}/api/orders/${orderId}`,
              { paymentStatus: updatePayload.paymentStatus },
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
              }
            );
            console.log("✅ Direct payment status update response:", directUpdateResponse.data);
          } catch (directError) {
            console.log("⚠️ Direct update failed, backend might have handled it in the status route:", directError.response?.data);
          }
        }
        
        return response.data;
      } catch (error) {
        console.error("Order status update error:", {
          error,
          response: error.response?.data,
          status: error.response?.status,
          url: `${base_url}/api/orders/${orderId}/status`,
        });

        if (error.response) {
          if (error.response.status === 404) {
            throw new Error(t("ordersPage.orderNotFound"));
          } else if (error.response.status === 401) {
            throw new Error(t("ordersPage.sessionExpired"));
          } else if (error.response.status === 403) {
            throw new Error(t("ordersPage.noPermission"));
          } else {
            throw new Error(
              error.response.data.message ||
                `${t("ordersPage.statusUpdateError")}: ${error.response.status}`
            );
          }
        } else if (error.request) {
          throw new Error(t("ordersPage.networkError"));
        } else {
          throw new Error(
            error.message || t("ordersPage.statusUpdateError")
          );
        }
      }
    },
    onSuccess: (data, variables) => {
      console.log("🎉 Update successful! Backend returned:", data);
      console.log("📝 Variables sent:", variables);
      
      // Show different success messages based on what was updated
      if (variables.status === "delivered") {
        toast.success(t("ordersPage.orderDeliveredAndPaid"));
      } else if (variables.status === "cancelled") {
        // Get the order to check what payment action was taken
        const currentOrder = orders.find(order => order._id === variables.orderId);
        console.log("🔍 Current order for cancellation check:", currentOrder);
        if (currentOrder?.paymentStatus === "pending") {
          toast.success(t("ordersPage.orderCancelledPaymentFailed"));
        } else {
          toast.success(t("ordersPage.orderCancelledSuccess"));
        }
      } else {
        toast.success(t("ordersPage.statusUpdatedSuccess"));
      }
      queryClient.invalidateQueries(["orders"]);
    },
    onError: (error) => {
      toast.error(error.message || t("ordersPage.statusUpdateError"));
      if (
        error.message.includes("session has expired") ||
        error.message.includes("not authenticated")
      ) {
        navigate("/login");
      }
    },
    onSettled: () => setUpdatingOrderId(null),
  });

  const formatCurrency = (amount) => {
    const num = Number(amount);
    // Convert from cents to dollars (database stores amounts in cents)
    return isNaN(num) ? "0.00" : (num / 100).toFixed(2);
  };

  const getOrderName = (order) => {
    return `#${order._id.slice(-6)}`;
  };

  // Get localized payment method
  const getPaymentMethodDisplay = (order) => {
    if (order.paymentMethodDisplay) {
      return getLocalizedText(order.paymentMethodDisplay, currentLang);
    }
    // Fallback to basic translation
    const methodMap = {
      credit_card: t("ordersPage.creditCard"),
      cash: t("ordersPage.cash"),
      bank_transfer: t("ordersPage.bankTransfer"),
    };
    return methodMap[order.paymentMethod] || order.paymentMethod;
  };

  // Get localized status display
  const getStatusDisplay = (status, displayObj = null) => {
    if (displayObj) {
      return getLocalizedText(displayObj, currentLang);
    }
    // Fallback to translation keys
    const statusMap = {
      pending: t("ordersPage.pending"),
      processing: t("ordersPage.processing"),
      shipped: t("ordersPage.shipped"),
      delivered: t("ordersPage.delivered"),
      cancelled: t("ordersPage.cancelled"),
      paid: t("ordersPage.paid"),
      failed: t("ordersPage.failed"),
    };
    return statusMap[status] || status;
  };

  // Get localized address
  const getLocalizedAddress = (order) => {
    if (!order.shippingAddress) return t("ordersPage.noAddress");
    
    const address = getLocalizedText(order.shippingAddress.address, currentLang);
    const city = getLocalizedText(order.shippingAddress.city, currentLang);
    const country = getLocalizedText(order.shippingAddress.country, currentLang);
    const postalCode = order.shippingAddress.postalCode;

    const parts = [address, city, postalCode, country].filter(Boolean);
    return parts.join(", ") || t("ordersPage.noAddress");
  };

  // Filtering logic
  const filteredOrders = orders.filter((order) => {
    const customer = order.customer || {};
    const fullName = `${customer.firstName || ""} ${
      customer.lastName || ""
    }`.toLowerCase();
    const matchesSearch =
      fullName.includes(searchTerm.toLowerCase()) ||
      (customer.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      getOrderName(order).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter ? order.status === statusFilter : true;
    const matchesPaymentStatus = paymentStatusFilter
      ? order.paymentStatus === paymentStatusFilter
      : true;
    return matchesSearch && matchesStatus && matchesPaymentStatus;
  });

  const handleStatusChange = (orderId, newStatus) => {
    if (!adminUser) {
      toast.error(t("ordersPage.loginRequired"));
      navigate("/login");
      return;
    }
    if (adminUser.role !== "admin") {
      toast.error(t("ordersPage.adminOnly"));
      return;
    }

    const validStatuses = [
      "pending",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ];
    if (!validStatuses.includes(newStatus)) {
      toast.error(t("ordersPage.invalidStatus"));
      return;
    }

    // Show confirmation for status changes that will also update payment status
    if (newStatus === "delivered") {
      const confirmMessage = t("ordersPage.confirmDeliveredStatus");
      if (!window.confirm(confirmMessage)) {
        return; // User cancelled
      }
    } else if (newStatus === "cancelled") {
      // Get current order to check payment status for confirmation message
      const currentOrder = orders.find(order => order._id === orderId);
      let confirmMessage = t("ordersPage.confirmCancelledStatus");
      
      if (currentOrder?.paymentStatus === "pending") {
        confirmMessage = t("ordersPage.confirmCancelledPendingPayment");
      } else if (currentOrder?.paymentStatus === "paid") {
        confirmMessage = t("ordersPage.confirmCancelledPaidOrder");
      }
      
      if (!window.confirm(confirmMessage)) {
        return; // User cancelled
      }
    }

    setUpdatingOrderId(orderId);
    updateOrderStatusMutation.mutate({ orderId, status: newStatus });
  };

  const generatePDFReceipt = (order) => {
    try {
      console.log("📄 Generating PDF for order:", order);
      
      // Create new PDF document
      const doc = new jsPDF();
      const currentLang = localStorage.getItem("language") || "en";
      
      // Set font for Arabic support (if needed)
      if (currentLang === "ar") {
        // For Arabic, we'll use default font but add RTL support in text positioning
        doc.setLanguage("ar");
      }

      // Company Header
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("Alalmyaa Store", 20, 25);
      
      // Add a line under company name
      doc.line(20, 30, 190, 30);
      
      // Receipt title
      doc.setFontSize(16);
      doc.text(t("ordersPage.orderReceipt"), 20, 45);
      
      // Order information
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      
      // Order details section
      const orderInfo = [
        [`${t("ordersPage.order")}:`, getOrderName(order)],
        [`${t("ordersPage.date")}:`, new Date(order.createdAt).toLocaleDateString()],
        [`${t("ordersPage.status")}:`, getStatusDisplay(order.status, order.statusDisplay)],
        [`${t("ordersPage.payment")}:`, getStatusDisplay(order.paymentStatus, order.paymentStatusDisplay)],
        [`${t("ordersPage.method")}:`, getPaymentMethodDisplay(order)]
      ];

      let yPosition = 60;
      orderInfo.forEach(([label, value]) => {
        doc.text(label, 20, yPosition);
        doc.text(value, 80, yPosition);
        yPosition += 8;
      });

      // Customer information
      yPosition += 10;
      doc.setFont("helvetica", "bold");
      doc.text(t("ordersPage.customerInformation"), 20, yPosition);
      yPosition += 10;
      
      doc.setFont("helvetica", "normal");
      const customer = order.customer || {};
      const customerInfo = [
        [`${t("forms.name")}:`, `${customer.firstName || ""} ${customer.lastName || ""}`.trim() || "N/A"],
        [`${t("forms.email")}:`, customer.email || "N/A"],
        [`${t("forms.phone")}:`, customer.phoneNumber || "N/A"],
        [`${t("ordersPage.address")}:`, getLocalizedAddress(order)]
      ];

      customerInfo.forEach(([label, value]) => {
        doc.text(label, 20, yPosition);
        // Handle long addresses by wrapping text
        const splitValue = doc.splitTextToSize(value, 100);
        doc.text(splitValue, 80, yPosition);
        yPosition += splitValue.length * 6 + 2;
      });

      // Items table
      yPosition += 10;
      doc.setFont("helvetica", "bold");
      doc.text(t("ordersPage.items"), 20, yPosition);
      yPosition += 10;

      // Table headers
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(t("ordersPage.item"), 20, yPosition);
      doc.text(t("ordersPage.quantity"), 110, yPosition);
      doc.text(t("ordersPage.price"), 140, yPosition);
      doc.text(t("ordersPage.total"), 170, yPosition);
      
      // Draw header line
      doc.line(20, yPosition + 2, 190, yPosition + 2);
      yPosition += 8;

      // Table data
      doc.setFont("helvetica", "normal");
      const items = order.items || order.cartItems || [];
      
      items.forEach(item => {
        const itemName = typeof item.product === 'object' && item.product?.name 
          ? getLocalizedText(item.product.name, currentLang)
          : `${t("ordersPage.product")} ID: ${item.product}`;
        
        // Handle long product names by truncating
        const truncatedName = itemName.length > 35 ? itemName.substring(0, 32) + "..." : itemName;
        
        doc.text(truncatedName, 20, yPosition);
        doc.text(item.quantity.toString(), 115, yPosition); // Center align
        doc.text(`$${formatCurrency(item.price)}`, 145, yPosition); // Right align
        doc.text(`$${formatCurrency(item.quantity * item.price)}`, 175, yPosition); // Right align
        
        yPosition += 6;
      });

      // Draw bottom line
      doc.line(20, yPosition + 2, 190, yPosition + 2);

      // Total section
      const finalY = yPosition + 15;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(`${t("ordersPage.total")}: $${formatCurrency(order.totalOrderPrice)}`, 20, finalY);

      // Footer
      const pageHeight = doc.internal.pageSize.height;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(t("ordersPage.thankYou"), 20, pageHeight - 30);
      doc.text(`${t("ordersPage.generatedOn")}: ${new Date().toLocaleString()}`, 20, pageHeight - 20);
      
      // Add border around the entire receipt
      doc.rect(15, 15, 180, pageHeight - 30);

      // Save the PDF
      const fileName = `order-${getOrderName(order)}-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      toast.success(t("ordersPage.receiptDownloaded"));
      console.log("✅ PDF generated successfully:", fileName);
      
    } catch (error) {
      console.error("❌ PDF generation error:", error);
      toast.error(t("ordersPage.receiptError"));
    }
  };

  const handleExport = (orderId) => {
    const order = orders.find(o => o._id === orderId);
    if (!order) {
      toast.error(t("ordersPage.orderNotFound"));
      return;
    }
    generatePDFReceipt(order);
  };

  const handleExportAll = () => {
    if (filteredOrders.length === 0) {
      toast.error(t("ordersPage.noOrdersToExport"));
      return;
    }

    // Show confirmation for bulk export
    const confirmMessage = t("ordersPage.confirmExportAll").replace("{count}", filteredOrders.length);
    if (!window.confirm(confirmMessage)) {
      return;
    }

    // Generate PDFs for all filtered orders
    toast.info(t("ordersPage.generatingReceipts"));
    
    filteredOrders.forEach((order, index) => {
      setTimeout(() => {
        generatePDFReceipt(order);
        
        // Show completion message for the last order
        if (index === filteredOrders.length - 1) {
          setTimeout(() => {
            toast.success(t("ordersPage.allReceiptsGenerated"));
          }, 500);
        }
      }, index * 1000); // 1 second delay between each PDF to avoid browser overload
    });
  };

  // Table columns definition
  const columns = [
    {
      key: "order",
      title: t("ordersPage.order"),
      render: (order) => getOrderName(order),
    },
    {
      key: "customer",
      title: t("ordersPage.customer"),
      render: (order) => {
        const customer = order.customer || {};
        return (
          <div className="flex items-center">
            <div className="h-10 w-10 flex-shrink-0">
              <img
                className="h-10 w-10 rounded-full object-cover"
                src={
                  customer.profilePicture ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    `${customer.firstName || ""} ${customer.lastName || ""}`
                  )}`
                }
                alt={`${customer.firstName || ""} ${customer.lastName || ""}`}
              />
            </div>
            <div className="ml-4 rtl:ml-0 rtl:mr-4">
              <div className="text-sm font-medium text-gray-900">
                {customer.firstName || "N/A"} {customer.lastName || "N/A"}
              </div>
              <div className="text-sm text-gray-500">
                {customer.email || "N/A"}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: "contact",
      title: t("ordersPage.contact"),
      render: (order) => {
        const customer = order.customer || {};
        return (
          <>
            <div className="text-sm text-gray-900">
              {customer.phoneNumber || "N/A"}
            </div>
            <div className="text-sm text-gray-500">
              {getLocalizedAddress(order)}
            </div>
          </>
        );
      },
    },
    {
      key: "date",
      title: t("ordersPage.date"),
      render: (order) => new Date(order.createdAt).toLocaleDateString(),
    },
    {
      key: "total",
      title: t("ordersPage.total"),
      render: (order) => `$${formatCurrency(order.totalOrderPrice)}`,
    },
    {
      key: "status",
      title: t("ordersPage.status"),
      render: (order) => (
        <select
          value={order.status || "pending"}
          onChange={(e) => handleStatusChange(order._id, e.target.value)}
          disabled={
            updatingOrderId === order._id ||
            !adminUser ||
            adminUser.role !== "admin"
          }
          className={`text-sm rounded-full px-2 py-1 font-semibold ${
            statusColors[order.status] || statusColors.pending
          } ${
            updatingOrderId === order._id ||
            !adminUser ||
            adminUser.role !== "admin"
              ? "opacity-50 cursor-not-allowed"
              : ""
          }`}
          title={order.status === "delivered" ? "" : t("ordersPage.deliveredWillUpdatePayment")}
        >
          <option value="pending">{t("ordersPage.pending")}</option>
          <option value="processing">{t("ordersPage.processing")}</option>
          <option value="shipped">{t("ordersPage.shipped")}</option>
          <option value="delivered" title={t("ordersPage.deliveredWillUpdatePayment")}>
            {t("ordersPage.delivered")} {order.status !== "delivered" ? "💳" : ""}
          </option>
          <option value="cancelled" title={t("ordersPage.cancelledWillUpdatePayment")}>
            {t("ordersPage.cancelled")} {order.status !== "cancelled" && order.paymentStatus === "pending" ? "❌" : ""}
          </option>
        </select>
      ),
    },
    {
      key: "payment",
      title: t("ordersPage.payment"),
      render: (order) => (
        <div>
          <Badge
            className={`rounded-full px-2 py-1 text-sm font-semibold ${
              paymentStatusColors[order.paymentStatus] ||
              paymentStatusColors.pending
            }`}
          >
            {getStatusDisplay(order.paymentStatus, order.paymentStatusDisplay)}
          </Badge>
          <div className="text-xs text-gray-500 mt-1">
            {getPaymentMethodDisplay(order)}
          </div>
        </div>
      ),
    },
    {
      key: "actions",
      title: t("ordersPage.actions"),
      render: (order) => (
        <div className="flex space-x-2 rtl:space-x-reverse justify-end">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setSelectedOrder(order);
              setIsModalOpen(true);
            }}
          >
            <FiEye className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleExport(order._id)}
            title={t("ordersPage.downloadReceipt")}
          >
            <FiDownload className="w-5 h-5" />
          </Button>
        </div>
      ),
    },
  ];

  if (ordersLoading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[60vh] space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        <span className="text-gray-600 text-lg">{t("ordersPage.loadingOrders")}</span>
      </div>
    );
  }

  if (ordersError) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[60vh] space-y-4">
        <div className="text-red-500 text-center p-6 bg-red-50 rounded-lg max-w-2xl">
          <h3 className="text-lg font-semibold mb-2">Backend Error</h3>
          <p className="text-sm mb-4">{ordersError.message}</p>
          <div className="text-xs text-gray-600 bg-gray-100 p-3 rounded mt-4">
            <strong>Quick Fix:</strong> In your backend <code>orderController.js</code>, make sure the <code>getAllOrders</code> function doesn't try to get an ID from <code>req.params</code> when called from the <code>/admin</code> route.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">{t("ordersPage.title")}</h1>
        <div className="flex space-x-4 rtl:space-x-reverse">
          <Button onClick={() => handleExportAll()}>
            <FiDownload className="w-5 h-5 mr-2 rtl:mr-0 rtl:ml-2" />
            {t("ordersPage.exportAll")}
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <Input
          type="text"
          placeholder={t("ordersPage.searchPlaceholder")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded-md px-3 py-2"
        >
          <option value="">{t("ordersPage.allStatus")}</option>
          <option value="pending">{t("ordersPage.pending")}</option>
          <option value="processing">{t("ordersPage.processing")}</option>
          <option value="shipped">{t("ordersPage.shipped")}</option>
          <option value="delivered">{t("ordersPage.delivered")}</option>
          <option value="cancelled">{t("ordersPage.cancelled")}</option>
        </select>
        <select
          value={paymentStatusFilter}
          onChange={(e) => setPaymentStatusFilter(e.target.value)}
          className="border rounded-md px-3 py-2"
        >
          <option value="">{t("ordersPage.allPaymentStatus")}</option>
          <option value="pending">{t("ordersPage.pending")}</option>
          <option value="paid">{t("ordersPage.paid")}</option>
          <option value="failed">{t("ordersPage.failed")}</option>
        </select>
      </div>

      <Card>
        <Table columns={columns} data={filteredOrders} />
      </Card>

      {/* Order Detail Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedOrder ? getOrderName(selectedOrder) : t("ordersPage.orderDetails")}
        size="xl"
      >
        {selectedOrder && (
          <div className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500 mb-3">
                {t("ordersPage.customerInformation")}
              </h3>
              <div className="flex items-start space-x-4 rtl:space-x-reverse">
                {(() => {
                  const customer = selectedOrder.customer || {};
                  return (
                    <>
                      <img
                        src={
                          customer.profilePicture ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            `${customer.firstName || ""} ${
                              customer.lastName || ""
                            }`
                          )}`
                        }
                        alt={`${customer.firstName || ""} ${
                          customer.lastName || ""
                        }`}
                        className="h-20 w-20 rounded-full object-cover"
                      />
                      <div className="flex-1">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {t("forms.name")}: {customer.firstName || "N/A"}{" "}
                              {customer.lastName || "N/A"}
                            </p>
                            <p className="text-sm text-gray-500">
                              {t("forms.email")}: {customer.email || "N/A"}
                            </p>
                            <p className="text-sm text-gray-500">
                              {t("forms.phone")}: {customer.phoneNumber || "N/A"}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">
                              {t("ordersPage.orderDate")}:{" "}
                              {new Date(
                                selectedOrder.createdAt
                              ).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm text-gray-500 mt-2">
                          {t("ordersPage.address")}: {getLocalizedAddress(selectedOrder)}
                        </p>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">
                  {t("ordersPage.paymentInformation")}
                </h3>
                <div className="mt-1 space-y-1">
                  <p className="text-sm text-gray-900">
                    {t("ordersPage.method")}: {getPaymentMethodDisplay(selectedOrder)}
                  </p>
                  <p className="text-sm text-gray-900">
                    {t("ordersPage.status")}:{" "}
                    <Badge
                      variant={
                        selectedOrder.paymentStatus === "paid"
                          ? "success"
                          : "warning"
                      }
                    >
                      {getStatusDisplay(selectedOrder.paymentStatus, selectedOrder.paymentStatusDisplay)}
                    </Badge>
                  </p>

                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">
                  {t("ordersPage.deliveryInformation")}
                </h3>
                <div className="mt-1 space-y-1">
                  <p className="text-sm text-gray-900">
                    {t("ordersPage.status")}:{" "}
                    <Badge
                      variant={
                        selectedOrder.status === "delivered"
                          ? "success"
                          : selectedOrder.status === "cancelled"
                          ? "danger"
                          : "warning"
                      }
                    >
                      {getStatusDisplay(selectedOrder.status, selectedOrder.statusDisplay)}
                    </Badge>
                  </p>

                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">{t("ordersPage.items")}</h3>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                        {t("ordersPage.item")}
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                        {t("ordersPage.quantity")}
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                        {t("ordersPage.price")}
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                        {t("ordersPage.total")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {(selectedOrder.items || selectedOrder.cartItems || []).map((item, index) => (
                      <tr key={item._id || index}>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {typeof item.product === 'object' && item.product?.name ? 
                            getLocalizedText(item.product.name, currentLang) : 
                            `${t("ordersPage.product")} ID: ${item.product}`}
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
                        className="px-4 py-2 text-sm font-medium text-gray-900 text-right rtl:text-left"
                      >
                        {t("ordersPage.total")}
                      </td>
                      <td className="px-4 py-2 text-sm font-medium text-gray-900">
                        ${formatCurrency(selectedOrder.totalOrderPrice)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={() => generatePDFReceipt(selectedOrder)}
                className="flex items-center"
              >
                <FiDownload className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" />
                {t("ordersPage.downloadReceipt")}
              </Button>
              <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
                {t("common.close")}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default OrdersPage;
