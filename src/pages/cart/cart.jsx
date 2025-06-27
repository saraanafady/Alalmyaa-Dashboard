import React, { useState, useMemo } from "react";
import { FiTrash2, FiPlus, FiMinus, FiEye, FiX } from "react-icons/fi";
import toast from "react-hot-toast";
import axios from "axios";
import { base_url } from "../../constants/axiosConfig";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "../../hooks/useTranslation";

const CartPage = () => {
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedItem, setSelectedItem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [updatingItemId, setUpdatingItemId] = useState(null);
  const [adminSearch, setAdminSearch] = useState("");
  const [adminMinPrice, setAdminMinPrice] = useState("");
  const [adminMaxPrice, setAdminMaxPrice] = useState("");
  const [editingCart, setEditingCart] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedProductToAdd, setSelectedProductToAdd] = useState("");
  const [newProductQuantity, setNewProductQuantity] = useState(1);

  // Get current language
  const currentLang = localStorage.getItem("language") || "en";

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

  // Function to safely format currency
  const formatCurrency = (amount) => {
    const num = Number(amount);
    return isNaN(num) ? "0.00" : num.toFixed(2);
  };

  // Fetch all carts for admin, or just the user's cart for normal users
  const fetchCarts = async () => {
    const token = localStorage.getItem("token");
    if (!token) throw new Error("No authentication token found");
    if (user && user.role === "admin") {
      const response = await axios.get(`${base_url}/api/cart/admin`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return { isAdmin: true, carts: response.data.data.carts };
    } else {
      const response = await axios.get(`${base_url}/api/cart`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return { isAdmin: false, cart: response.data.data };
    }
  };

  const {
    data: cartData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["cart", user?.role],
    queryFn: fetchCarts,
    retry: 3,
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!user,
  });

  // Fetch all products for the dropdown (admin only)
  const { data: allProducts = [], isLoading: productsLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      try {
        console.log("🛍️ Fetching products for dropdown...");
        const response = await axios.get(`${base_url}/api/product`);
        console.log("✅ Products API Response:", response.data);
        const products = response.data.data || [];
        console.log("📦 Products for dropdown:", products);
        
        // Process products to get correct pricing
        const processedProducts = products.map(product => {
          const prices = product.variants?.flatMap((v) =>
            v.options?.map((o) => o.priceAfterDiscount || o.price)
          ) || [];
          
          let price = 0;
          if (prices.length > 0) {
            const validPrices = prices.filter((p) => typeof p === "number" && p > 0);
            if (validPrices.length > 0) {
              price = Math.min(...validPrices); // Use minimum price
            }
          }
          
          return {
            ...product,
            price: price,
            displayPrice: price
          };
        });
        
        console.log("🏷️ Processed products with pricing:", processedProducts);
        return processedProducts;
      } catch (error) {
        console.error("❌ Error fetching products:", error);
        throw error;
      }
    },
    enabled: !!user && user.role === "admin",
    staleTime: 10 * 60 * 1000, // 10 minutes
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
      toast.success(t("cartPage.cartUpdatedSuccess"));
      queryClient.invalidateQueries(["cart"]);
    },
    onError: (error) => {
      toast.error(error.message || t("cartPage.cartUpdateError"));
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
      toast.success(t("cartPage.itemRemovedSuccess"));
      queryClient.invalidateQueries(["cart"]);
    },
    onError: (error) => {
      toast.error(error.message || t("cartPage.itemRemoveError"));
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
      const productName = getLocalizedText(item.product?.name, currentLang, "").toLowerCase();
      const productDescription = getLocalizedText(item.product?.description, currentLang, "").toLowerCase();
      const matchesSearch = productName.includes(searchTerm.toLowerCase()) ||
                          productDescription.includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [cartData?.items, searchTerm, currentLang]);

  // Memoized filtered admin carts
  const filteredAdminCarts = useMemo(() => {
    if (!cartData?.isAdmin || !cartData.carts) return [];
    return cartData.carts.filter(cart => {
      const name = `${cart.user?.firstName || ''} ${cart.user?.lastName || ''}`.toLowerCase();
      const searchMatch = name.includes(adminSearch.toLowerCase());
      const total = cart.totalPriceAfterDiscount || cart.totalPrice || 0;
      const minOk = adminMinPrice === "" || total >= Number(adminMinPrice);
      const maxOk = adminMaxPrice === "" || total <= Number(adminMaxPrice);
      return searchMatch && minOk && maxOk;
    });
  }, [cartData, adminSearch, adminMinPrice, adminMaxPrice]);

  const deleteCartMutation = useMutation({
    mutationFn: async (cartId) => {
      const token = localStorage.getItem("token");
      await axios.delete(`${base_url}/api/cart/admin/${cartId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onSuccess: () => {
      toast.success(t("cartPage.cartDeletedSuccess"));
      queryClient.invalidateQueries(["cart"]);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || t("cartPage.cartDeleteError"));
    },
  });

  const handleDeleteCart = (cartId) => {
    if (window.confirm(t("cartPage.confirmDeleteCart"))) {
      deleteCartMutation.mutate(cartId);
    }
  };

  const updateCartMutation = useMutation({
    mutationFn: async ({ cartId, data }) => {
      const token = localStorage.getItem("token");
      return axios.patch(`${base_url}/api/cart/admin/${cartId}`, data, {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onSuccess: () => {
      toast.success(t("cartPage.cartUpdatedSuccess"));
      queryClient.invalidateQueries(["cart"]);
      handleCloseEditModal();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || t("cartPage.cartUpdateError"));
    },
  });

  const handleUpdateCart = (cart) => {
    setEditingCart(cart);
    setEditModalOpen(true);
    // Reset add product form
    setSelectedProductToAdd("");
    setNewProductQuantity(1);
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setEditingCart(null);
    // Reset add product form
    setSelectedProductToAdd("");
    setNewProductQuantity(1);
  };

  const handleSaveCart = (updatedCartData) => {
    updateCartMutation.mutate({ cartId: editingCart._id, data: updatedCartData });
  };

  const handleAddProductToCart = () => {
    if (!selectedProductToAdd || newProductQuantity < 1) {
      toast.error(t("cartPage.selectProductAndQuantity"));
      return;
    }

    const selectedProduct = allProducts.find(p => p._id === selectedProductToAdd);
    if (!selectedProduct) {
      toast.error(t("cartPage.productNotFound"));
      return;
    }

    // Check stock availability
    if (selectedProduct.totalStock !== undefined && selectedProduct.totalStock === 0) {
      toast.error(t("cartPage.productOutOfStock"));
      return;
    }

    console.log("🛒 Adding product to cart:", {
      product: selectedProduct,
      quantity: newProductQuantity,
      price: selectedProduct.price,
      variants: selectedProduct.variants
    });

    // Check if product already exists in cart
    const existingItemIndex = editingCart.items.findIndex(
      item => {
        const productId = item.product?._id || item.product;
        return productId === selectedProductToAdd;
      }
    );

    if (existingItemIndex >= 0) {
      // Update quantity of existing item
      const newItems = [...editingCart.items];
      newItems[existingItemIndex].quantity += newProductQuantity;
      setEditingCart({ ...editingCart, items: newItems });
      toast.success(t("cartPage.productQuantityUpdated"));
    } else {
      // Add new item to cart with complete product structure
      const newItem = {
        product: {
          _id: selectedProduct._id,
          name: selectedProduct.name,
          brand: selectedProduct.brand,
          images: selectedProduct.images,
          description: selectedProduct.description,
          variants: selectedProduct.variants,
          totalStock: selectedProduct.totalStock,
          isActive: selectedProduct.isActive
        },
        quantity: newProductQuantity,
        price: selectedProduct.price || 0,
        _id: `temp_${Date.now()}` // Temporary ID for new items
      };
      
      console.log("➕ New item being added:", newItem);
      
      setEditingCart({
        ...editingCart,
        items: [...editingCart.items, newItem]
      });
      toast.success(t("cartPage.productAddedToCart"));
    }

    // Reset form
    setSelectedProductToAdd("");
    setNewProductQuantity(1);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[60vh] space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        <span className="text-gray-600 text-lg">{t("cartPage.loadingCarts")}</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{t("cartPage.errorLoadingCart")}: {error?.message}</p>
        <button
          onClick={() => queryClient.invalidateQueries(["cart"])}
          className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
        >
          {t("cartPage.retry")}
        </button>
      </div>
    );
  }

  if (cartData?.isAdmin) {
    // Admin view: all carts
    return (
      <div className="space-y-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-4">{t("cartPage.adminTitle")}</h1>
        {/* Admin Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <input
            type="text"
            placeholder={t("cartPage.adminSearchPlaceholder")}
            value={adminSearch}
            onChange={e => setAdminSearch(e.target.value)}
            className="border px-3 py-2 rounded w-full md:w-1/3"
          />
          <input
            type="number"
            placeholder={t("cartPage.minPrice")}
            value={adminMinPrice}
            onChange={e => setAdminMinPrice(e.target.value)}
            className="border px-3 py-2 rounded w-full md:w-1/6"
          />
          <input
            type="number"
            placeholder={t("cartPage.maxPrice")}
            value={adminMaxPrice}
            onChange={e => setAdminMaxPrice(e.target.value)}
            className="border px-3 py-2 rounded w-full md:w-1/6"
          />
          <div className="flex items-center text-gray-600 text-sm ml-auto rtl:ml-0 rtl:mr-auto">
            {t("cartPage.showing")} <span className="font-semibold mx-1">{filteredAdminCarts.length}</span> {filteredAdminCarts.length === 1 ? t("cartPage.cart") : t("cartPage.carts")}
          </div>
        </div>
        {filteredAdminCarts.length === 0 && <div>{t("cartPage.noCartsFound")}</div>}
        {filteredAdminCarts.map((cart) => (
          <div key={cart._id} className="bg-white shadow rounded-lg p-6 mb-8">
            <div className="mb-2 flex justify-between items-center">
              <div>
                <span className="font-semibold">{t("cartPage.user")}:</span> {cart.user?.firstName} {cart.user?.lastName} ({cart.user?.email})
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleUpdateCart(cart)}
                  className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  {t("cartPage.update")}
                </button>
                <button
                  onClick={() => handleDeleteCart(cart._id)}
                  className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  {t("cartPage.delete")}
                </button>
              </div>
            </div>
            <div className="mb-2">
              <span className="font-semibold">{t("cartPage.phone")}:</span> {cart.user?.phoneNumber || 'N/A'}
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 mb-4">
                <thead className="bg-gray-50">
                  <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">{t("cartPage.product")}</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">{t("cartPage.quantity")}</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">{t("cartPage.price")}</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">{t("cartPage.total")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {cart.items.map((item, idx) => (
                    <tr key={item._id || idx}>
                      <td className="px-4 py-2 text-sm text-gray-900">{getLocalizedText(item.product?.name, currentLang, 'N/A')}</td>
                      <td className="px-4 py-2 text-sm text-gray-500">{item.quantity}</td>
                      <td className="px-4 py-2 text-sm text-gray-500">${formatCurrency(item.price)}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">${formatCurrency(item.price * item.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end space-x-8 rtl:space-x-reverse">
              <div><span className="font-semibold">{t("cartPage.total")}:</span> ${formatCurrency(cart.totalPrice)}</div>
              <div><span className="font-semibold">{t("cartPage.discount")}:</span> {cart.discount || 0}%</div>
              <div><span className="font-semibold">{t("cartPage.totalAfterDiscount")}:</span> ${formatCurrency(cart.totalPrice - (cart.totalPrice * (cart.discount || 0) / 100))}</div>
            </div>
          </div>
        ))}
        {editModalOpen && editingCart && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-xl">
                <h2 className="text-2xl font-bold">{t("cartPage.editCart")}</h2>
                <p className="text-blue-100 mt-1">
                  {t("cartPage.customer")}: {editingCart.user?.firstName} {editingCart.user?.lastName}
                </p>
              </div>

              <div className="p-6 space-y-6">
                {/* Discount Section */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t("cartPage.discount")} (%)
                  </label>
              <input
                type="number"
                    min="0"
                    max="100"
                    value={editingCart.discount || 0}
                onChange={e => setEditingCart({ ...editingCart, discount: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="0"
                  />
                </div>

                {/* Current Items Section */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm mr-2">
                      {editingCart.items.length}
                    </span>
                    {t("cartPage.currentItems")}
                  </h3>
                  
                  {editingCart.items.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                      <div className="text-4xl mb-2">🛒</div>
                      <p>{t("cartPage.noItemsInCart")}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                {editingCart.items.map((item, idx) => (
                        <div key={item._id || idx} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3 rtl:space-x-reverse flex-1">
                              {/* Product Image */}
                              <div className="flex-shrink-0">
                                {item.product?.images?.length > 0 ? (
                                  <img
                                    src={item.product.images[0].url}
                                    alt={getLocalizedText(item.product?.name, currentLang, t("cartPage.unnamedProduct"))}
                                    className="w-12 h-12 object-cover rounded-lg border"
                                  />
                                ) : (
                                  <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                              
                              {/* Product Info */}
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-900">
                                  {getLocalizedText(item.product?.name, currentLang, t("cartPage.unnamedProduct"))}
                                </h4>
                                {item.product?.brand?.name && (
                                  <p className="text-sm text-gray-500">
                                    {getLocalizedText(item.product.brand.name, currentLang, "")}
                                  </p>
                                )}
                                <div className="text-sm text-gray-600 mt-1 flex items-center space-x-4 rtl:space-x-reverse">
                                  <span>{t("cartPage.price")}: ${formatCurrency(item.price || item.product?.price || 0)}</span>
                                  <span>{t("cartPage.total")}: ${formatCurrency((item.price || item.product?.price || 0) * item.quantity)}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3 rtl:space-x-reverse">
                              <div className="flex items-center">
                                <label className="text-sm font-medium text-gray-700 mr-2 rtl:mr-0 rtl:ml-2">
                                  {t("cartPage.quantity")}:
                                </label>
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={e => {
                        const newItems = editingCart.items.map((it, i) =>
                          i === idx ? { ...it, quantity: Number(e.target.value) } : it
                        );
                        setEditingCart({ ...editingCart, items: newItems });
                      }}
                                  className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                              </div>
                    <button
                      onClick={() => {
                        const newItems = editingCart.items.filter((_, i) => i !== idx);
                        setEditingCart({ ...editingCart, items: newItems });
                      }}
                                className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors flex items-center"
                                title={t("cartPage.remove")}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add Product Section */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm mr-2">+</span>
                    {t("cartPage.addProduct")}
                  </h3>
                  
                  <div className="bg-green-50 rounded-lg p-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t("cartPage.selectProduct")}
                        </label>
                        {productsLoading ? (
                          <div className="flex items-center justify-center py-3 text-gray-500">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400 mr-2"></div>
                            {t("cartPage.loadingProducts")}
                          </div>
                        ) : (
                          <select
                            value={selectedProductToAdd}
                            onChange={e => setSelectedProductToAdd(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                          >
                            <option value="">{t("cartPage.chooseProduct")}</option>
                            {allProducts.map(product => {
                              const productName = getLocalizedText(product.name, currentLang, t("cartPage.unnamedProduct"));
                              const brandName = getLocalizedText(product.brand?.name, currentLang, "");
                              const displayName = brandName ? `${productName} (${brandName})` : productName;
                              const priceDisplay = product.price > 0 ? `$${formatCurrency(product.price)}` : t("cartPage.priceNotSet");
                              
                              return (
                                <option key={product._id} value={product._id}>
                                  {displayName} - {priceDisplay}
                                </option>
                              );
                            })}
                          </select>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t("cartPage.quantity")}
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={newProductQuantity}
                          onChange={e => setNewProductQuantity(Number(e.target.value))}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                          placeholder="1"
                        />
                      </div>
                    </div>
                    
                                         {/* Selected Product Preview */}
                     {selectedProductToAdd && (
                       <div className="bg-white rounded-lg p-4 border border-green-200">
                         {(() => {
                           const selectedProduct = allProducts.find(p => p._id === selectedProductToAdd);
                           if (!selectedProduct) return null;
                           
                           const productName = getLocalizedText(selectedProduct.name, currentLang, t("cartPage.unnamedProduct"));
                           const brandName = getLocalizedText(selectedProduct.brand?.name, currentLang, "");
                           const productImage = selectedProduct.images?.length > 0 ? selectedProduct.images[0].url : null;
                           const totalPrice = (selectedProduct.price || 0) * newProductQuantity;
                           
                           return (
                             <div className="flex items-center space-x-4 rtl:space-x-reverse">
                               {/* Product Image */}
                               <div className="flex-shrink-0">
                                 {productImage ? (
                                   <img
                                     src={productImage}
                                     alt={productName}
                                     className="w-16 h-16 object-cover rounded-lg border"
                                   />
                                 ) : (
                                   <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                                     <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                     </svg>
                                   </div>
                                 )}
                               </div>
                               
                               {/* Product Details */}
                               <div className="flex-1">
                                 <h4 className="font-medium text-gray-900">{productName}</h4>
                                 {brandName && (
                                   <p className="text-sm text-gray-600">{brandName}</p>
                                 )}
                                 <div className="text-sm text-gray-600 mt-1">
                                   <span>{t("cartPage.price")}: ${formatCurrency(selectedProduct.price || 0)}</span>
                                   <span className="mx-2">×</span>
                                   <span>{newProductQuantity}</span>
                                   <span className="mx-2">=</span>
                                   <span className="font-medium text-gray-900">${formatCurrency(totalPrice)}</span>
                                 </div>
                                 {selectedProduct.totalStock !== undefined && (
                                   <p className="text-xs text-gray-500 mt-1">
                                     {t("cartPage.stock")}: {selectedProduct.totalStock > 0 ? selectedProduct.totalStock : t("cartPage.outOfStock")}
                                   </p>
                                 )}
                               </div>
                               
                               {/* Add Button */}
                               <button
                                 onClick={handleAddProductToCart}
                                 disabled={!selectedProductToAdd || newProductQuantity < 1 || selectedProduct.totalStock === 0}
                                 className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center"
                               >
                                 <svg className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                 </svg>
                                 {t("cartPage.add")}
                    </button>
                             </div>
                           );
                         })()}
                       </div>
                     )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-6 py-4 rounded-b-xl flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  {t("cartPage.totalItems")}: {editingCart.items.length}
                </div>
                <div className="flex space-x-3 rtl:space-x-reverse">
                <button
                    onClick={handleCloseEditModal}
                    className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    {t("cartPage.cancel")}
                  </button>
                <button
                  onClick={() => handleSaveCart({
                      discount: Number(editingCart.discount || 0),
                    items: editingCart.items.map(({ product, quantity, price }) => ({
                      product: product._id || product,
                      quantity,
                        price: price || product?.price || 0
                    }))
                  })}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center"
                  disabled={updateCartMutation.isLoading}
                  >
                    {updateCartMutation.isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        {t("cartPage.saving")}
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {t("cartPage.save")}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">{t("cartPage.title")}</h1>
      </div>

      {/* Search */}
      <div className="flex space-x-4 rtl:space-x-reverse">
        <div className="flex-1">
          <input
            type="text"
            placeholder={t("cartPage.searchPlaceholder")}
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
                    {t("cartPage.product")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("cartPage.price")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("cartPage.quantity")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("cartPage.total")}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("cartPage.actions")}
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
                          alt={getLocalizedText(item.product?.name, currentLang, "Product")}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "https://via.placeholder.com/150";
                          }}
                        />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {getLocalizedText(item.product?.name, currentLang, "N/A")}
                        </div>
                        <div className="text-sm text-gray-500">
                          {getLocalizedText(item.product?.description, currentLang, "").slice(0, 50)}...
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
                          <span className="animate-pulse">{t("cartPage.updating")}</span>
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
            {t("cartPage.orderSummary")}
          </h3>
          <div className="mt-6 space-y-4">
            <div className="flex justify-between text-base text-gray-600">
              <p>{t("cartPage.subtotal")}</p>
              <p>${formatCurrency(cartData.totalPrice)}</p>
            </div>
            {cartData.discount > 0 && (
              <div className="flex justify-between text-base text-gray-600">
                <p>{t("cartPage.discount")} ({cartData.discount}%)</p>
                <p>-${formatCurrency(cartData.totalPrice * (cartData.discount / 100))}</p>
              </div>
            )}
            <div className="flex justify-between text-base text-gray-600">
              <p>{t("cartPage.tax")}</p>
              <p>${formatCurrency(cartData.totalPriceAfterDiscount * 0.1)}</p>
            </div>
            <div className="flex justify-between text-base font-medium text-gray-900">
              <p>{t("cartPage.total")}</p>
              <p>${formatCurrency(cartData.totalPriceAfterDiscount * 1.1)}</p>
            </div>
            <div className="mt-6">
              <button
                type="button"
                className="w-full bg-primary-600 border border-transparent rounded-md shadow-sm py-3 px-4 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                {t("cartPage.proceedToCheckout")}
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
                  {getLocalizedText(selectedItem.product?.name, currentLang, "N/A")}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {t("cartPage.productDetails")}
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
                  alt={getLocalizedText(selectedItem.product?.name, currentLang, "Product")}
                  className="h-32 w-32 rounded-lg object-cover"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "https://via.placeholder.com/150";
                  }}
                />
                <div className="flex-1">
                  <p className="text-sm text-gray-900 mb-2">
                    {getLocalizedText(selectedItem.product?.description, currentLang, t("cartPage.noDescriptionAvailable"))}
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {t("cartPage.price")}: ${formatCurrency(selectedItem.price)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {t("cartPage.quantity")}: {selectedItem.quantity}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">
                          {t("cartPage.total")}: ${formatCurrency(selectedItem.price * selectedItem.quantity)}
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
