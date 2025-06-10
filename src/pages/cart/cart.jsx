import React, { useState, useMemo } from "react";
import { FiTrash2, FiPlus, FiMinus, FiEye, FiX } from "react-icons/fi";
import toast from "react-hot-toast";
import axios from "axios";
import { base_url } from "../../constants/axiosConfig";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const CartPage = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedItem, setSelectedItem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [updatingItemId, setUpdatingItemId] = useState(null);

  // Function to safely format currency
  const formatCurrency = (amount) => {
    const num = Number(amount);
    return isNaN(num) ? "0.00" : num.toFixed(2);
  };

  // Fetch cart items from the API
  const fetchCartItems = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      console.log("Fetching cart with token:", token);
      console.log("API URL:", `${base_url}/api/cart`);

      const response = await axios.get(`${base_url}/api/cart`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        withCredentials: true
      });

      console.log("Cart API Response:", response.data);

      if (!response.data) {
        console.error("Empty response from API");
        return { items: [], totalPrice: 0, discount: 0, totalPriceAfterDiscount: 0 };
      }

      // The backend returns the cart data directly, not wrapped in a data property
      const cartData = response.data;
      
      // Validate the cart data structure
      if (!Array.isArray(cartData.items)) {
        console.error("Invalid cart data structure:", cartData);
        return { items: [], totalPrice: 0, discount: 0, totalPriceAfterDiscount: 0 };
      }

      return {
        items: cartData.items || [],
        totalPrice: cartData.totalPrice || 0,
        discount: cartData.discount || 0,
        totalPriceAfterDiscount: cartData.totalPrice || 0 // Since there's no totalPriceAfterDiscount in backend
      };
    } catch (error) {
      console.error("Error fetching cart items:", error);
      console.error("Error details:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        headers: error.response?.headers,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers
        }
      });

      // Log the full error response if available
      if (error.response) {
        console.error("Full error response:", {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          headers: error.response.headers
        });
      }

      if (error.response?.status === 401) {
        navigate("/login");
      }
      return { items: [], totalPrice: 0, discount: 0, totalPriceAfterDiscount: 0 };
    }
  };

  const {
    data: cartData = { items: [], totalPrice: 0, discount: 0, totalPriceAfterDiscount: 0 },
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["cart"],
    queryFn: fetchCartItems,
    retry: 3,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Update quantity mutation
  const updateQuantityMutation = useMutation({
    mutationFn: async ({ productId, quantity }) => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          throw new Error("No authentication token found");
        }

        const response = await axios.patch(
          `${base_url}/api/cart/items/${productId}`,
          { quantity },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        return response.data;
      } catch (error) {
        console.error("Error updating cart item:", error);
        throw new Error(error.response?.data?.message || "Failed to update cart item");
      }
    },
    onSuccess: () => {
      toast.success("Cart updated successfully");
      queryClient.invalidateQueries(["cart"]);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update cart");
    },
  });

  // Remove item mutation
  const removeItemMutation = useMutation({
    mutationFn: async (productId) => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          throw new Error("No authentication token found");
        }

        const response = await axios.delete(`${base_url}/api/cart/items/${productId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        return response.data;
      } catch (error) {
        console.error("Error removing cart item:", error);
        throw new Error(error.response?.data?.message || "Failed to remove item from cart");
      }
    },
    onSuccess: () => {
      toast.success("Item removed from cart");
      queryClient.invalidateQueries(["cart"]);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to remove item");
    },
  });

  const handleQuantityChange = (productId, change) => {
    const item = cartData.items.find((i) => i.product._id === productId);
    if (!item) return;

    const newQuantity = Math.max(1, item.quantity + change);
    setUpdatingItemId(productId);
    updateQuantityMutation.mutate(
      { productId, quantity: newQuantity },
      {
        onSettled: () => setUpdatingItemId(null),
      }
    );
  };

  const handleRemoveItem = (productId) => {
    removeItemMutation.mutate(productId);
  };

  // Optimize filtering with useMemo
  const filteredItems = useMemo(() => {
    if (!cartData?.items) return [];
    
    return cartData.items.filter((item) => {
      const matchesSearch = item.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.product?.description?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [cartData?.items, searchTerm]);

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[60vh] space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        <span className="text-gray-600 text-lg">Loading cart...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Error loading cart: {error?.message}</p>
        <button
          onClick={() => queryClient.invalidateQueries(["cart"])}
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
        <h1 className="text-2xl font-semibold text-gray-900">Shopping Cart</h1>
      </div>

      {/* Search */}
      <div className="flex space-x-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border bg-white border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
      </div>

      {/* Cart Items */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredItems.map((item) => (
                <tr key={item.product._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-16 w-16 flex-shrink-0">
                        <img
                          className="h-16 w-16 rounded-md object-cover"
                          src={item.product?.image || "https://via.placeholder.com/150"}
                          alt={item.product?.name}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "https://via.placeholder.com/150";
                          }}
                        />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {item.product?.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {item.product?.description?.slice(0, 50)}...
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      ${formatCurrency(item.price)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleQuantityChange(item.product._id, -1)}
                        disabled={updatingItemId === item.product._id}
                        className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
                      >
                        <FiMinus className="h-4 w-4" />
                      </button>
                      <span className="text-sm text-gray-900">
                        {updatingItemId === item.product._id ? (
                          <span className="animate-pulse">Updating...</span>
                        ) : (
                          item.quantity
                        )}
                      </span>
                      <button
                        onClick={() => handleQuantityChange(item.product._id, 1)}
                        disabled={updatingItemId === item.product._id}
                        className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
                      >
                        <FiPlus className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      ${formatCurrency(item.price * item.quantity)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => {
                        setSelectedItem(item);
                        setIsModalOpen(true);
                      }}
                      className="text-primary-600 hover:text-primary-900 mr-4"
                    >
                      <FiEye className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleRemoveItem(item.product._id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <FiTrash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Summary */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            Order Summary
          </h3>
          <div className="mt-6 space-y-4">
            <div className="flex justify-between text-base text-gray-600">
              <p>Subtotal</p>
              <p>${formatCurrency(cartData.totalPrice)}</p>
            </div>
            {cartData.discount > 0 && (
              <div className="flex justify-between text-base text-gray-600">
                <p>Discount ({cartData.discount}%)</p>
                <p>-${formatCurrency(cartData.totalPrice * (cartData.discount / 100))}</p>
              </div>
            )}
            <div className="flex justify-between text-base text-gray-600">
              <p>Tax (10%)</p>
              <p>${formatCurrency(cartData.totalPriceAfterDiscount * 0.1)}</p>
            </div>
            <div className="flex justify-between text-base font-medium text-gray-900">
              <p>Total</p>
              <p>${formatCurrency(cartData.totalPriceAfterDiscount * 1.1)}</p>
            </div>
            <div className="mt-6">
              <button
                type="button"
                className="w-full bg-primary-600 border border-transparent rounded-md shadow-sm py-3 px-4 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Proceed to Checkout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Item Details Modal */}
      {isModalOpen && selectedItem && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {selectedItem.product?.name}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Product Details
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
              <div className="flex items-start space-x-4">
                <img
                  src={selectedItem.product?.image || "https://via.placeholder.com/150"}
                  alt={selectedItem.product?.name}
                  className="h-32 w-32 rounded-lg object-cover"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "https://via.placeholder.com/150";
                  }}
                />
                <div className="flex-1">
                  <p className="text-sm text-gray-900 mb-2">
                    {selectedItem.product?.description}
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Price: ${formatCurrency(selectedItem.price)}
                      </p>
                      <p className="text-sm text-gray-500">
                        Quantity: {selectedItem.quantity}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">
                        Total: ${formatCurrency(selectedItem.price * selectedItem.quantity)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartPage;
