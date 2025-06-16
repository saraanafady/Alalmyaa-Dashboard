import React, { useState } from "react";
import Card from "../../components/Card";
import Table from "../../components/Table";
import Button from "../../components/Button";
import Badge from "../../components/Badge";
import { FiEdit2, FiTrash2, FiPlus, FiEye } from "react-icons/fi";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { base_url } from "../../constants/axiosConfig";
import { useTranslation } from "react-i18next";

const ProductPreview = ({ product, onClose }) => {
  const { i18n } = useTranslation();
  
  // Helper function to get localized text from multilingual objects
  const getLocalizedText = (textObj, fallback = '') => {
    const currentLanguage = i18n.language;
    
    if (!textObj) {
      return fallback;
    }
    
    // Handle simple string values (backward compatibility)
    if (typeof textObj === 'string' && textObj.trim()) {
      return textObj.trim();
    }
    
    // Handle multilingual object structure {en: "...", ar: "..."}
    if (typeof textObj === 'object' && textObj !== null && !Array.isArray(textObj)) {
      // Try current language first
      if (textObj[currentLanguage] && typeof textObj[currentLanguage] === 'string' && textObj[currentLanguage].trim()) {
        return textObj[currentLanguage].trim();
      }
      
      // Fallback to English if current language is not available
      if (textObj.en && typeof textObj.en === 'string' && textObj.en.trim()) {
        return textObj.en.trim();
      }
      
      // Fallback to Arabic if English is not available
      if (textObj.ar && typeof textObj.ar === 'string' && textObj.ar.trim()) {
        return textObj.ar.trim();
      }
    }
    
    return fallback;
  };

  if (!product) return null;

  return (
    <div className="space-y-6 max-h-[80vh] overflow-y-auto p-6">
      {/* Header with Image and Basic Info */}
      <div className="flex gap-6">
        <div className="w-1/3">
          <img
            src={product.coverImage}
            alt={getLocalizedText(product.name, "Product Image")}
            className="w-full h-64 object-cover rounded-lg shadow-lg"
          />
        </div>
        <div className="w-2/3 space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">{getLocalizedText(product.name, "Unnamed Product")}</h2>
          <div className="flex items-center gap-2">
            <Badge variant={product.totalStock > 0 ? "success" : "error"}>
              {product.totalStock > 0 ? "In Stock" : "Out of Stock"}
            </Badge>
            <span className="text-gray-500">•</span>
            <span className="text-gray-600">
              Total Stock: {product.totalStock}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-600">Category:</span>
            <span className="font-medium">{product.category ? getLocalizedText(product.category.name, "No Category") : "No Category"}</span>
            {product.subCategory && (
              <>
                <span className="text-gray-500">•</span>
                <span className="font-medium">{getLocalizedText(product.subCategory.name, "No Subcategory")}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-600">Brand:</span>
            <span className="font-medium">{product.brand ? getLocalizedText(product.brand.name, "No Brand") : "No Brand"}</span>
          </div>
        </div>
      </div>

      {/* Price Information */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">Price Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-gray-600">Base Price:</span>
            <span className="ml-2 font-medium">
              ${product.basePrice.toFixed(2)}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Best Price After Discount:</span>
            <span className="ml-2 font-medium">
              ${product.bestPriceAfterDiscount.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Variants */}
      {product.variants && product.variants.length > 0 && (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Product Variants</h3>
        {product.variants.map((variant, index) => (
          <div key={index} className="border rounded-lg p-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16">
                {variant.images && variant.images.length > 0 && (
                  <img
                    src={variant.images[0]}
                    alt={variant.color}
                    className="w-full h-full object-cover rounded"
                  />
                )}
              </div>
              <div>
                <h4 className="font-medium">Color: {variant.color}</h4>
                <div className="flex gap-2 mt-1">
                  {variant.images && variant.images.map((image, imgIndex) => (
                    <img
                      key={imgIndex}
                      src={image}
                      alt={`${variant.color} variant ${imgIndex + 1}`}
                      className="w-8 h-8 object-cover rounded cursor-pointer hover:opacity-75"
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              {variant.storageOptions && variant.storageOptions.map((option, optIndex) => (
                <div
                  key={optIndex}
                  className="flex items-center justify-between bg-gray-50 p-2 rounded"
                >
                  <div>
                    <span className="font-medium">{option.storage}GB</span>
                    <span className="text-gray-500 ml-2">
                      (SKU: {option.sku})
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm text-gray-500 line-through">
                        ${option.price.toFixed(2)}
                      </div>
                      <div className="font-medium text-green-600">
                        ${option.priceAfterDiscount.toFixed(2)}
                      </div>
                    </div>
                    <Badge variant={option.stock > 0 ? "success" : "error"}>
                      Stock: {option.stock}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      )}

      {/* Specifications */}
      {Object.keys(product.specifications).length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Specifications</h3>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(product.specifications).map(([key, value]) => (
              <div key={key} className="bg-gray-50 p-3 rounded">
                <span className="text-gray-600">{key}:</span>
                <span className="ml-2 font-medium">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Description */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Description</h3>
        <p className="text-gray-600">{getLocalizedText(product.description, "No description available")}</p>
      </div>

      {/* Additional Info */}
      <div className="grid grid-cols-3 gap-4 text-sm text-gray-500">
        <div>Created: {new Date(product.createdAt).toLocaleDateString()}</div>
        <div>Views: {product.views}</div>
        <div>Sold: {product.sold}</div>
      </div>
    </div>
  );
};

const ProductsPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { i18n } = useTranslation();

  // Helper function to get localized text from multilingual objects
  const getLocalizedText = (textObj, fallback = '') => {
    const currentLanguage = i18n.language;
    
    if (!textObj) {
      return fallback;
    }
    
    // Handle simple string values (backward compatibility)
    if (typeof textObj === 'string' && textObj.trim()) {
      return textObj.trim();
    }
    
    // Handle multilingual object structure {en: "...", ar: "..."}
    if (typeof textObj === 'object' && textObj !== null && !Array.isArray(textObj)) {
      // Try current language first
      if (textObj[currentLanguage] && typeof textObj[currentLanguage] === 'string' && textObj[currentLanguage].trim()) {
        return textObj[currentLanguage].trim();
      }
      
      // Fallback to English if current language is not available
      if (textObj.en && typeof textObj.en === 'string' && textObj.en.trim()) {
        return textObj.en.trim();
      }
      
      // Fallback to Arabic if English is not available
      if (textObj.ar && typeof textObj.ar === 'string' && textObj.ar.trim()) {
        return textObj.ar.trim();
      }
    }
    
    return fallback;
  };

  const fetchProducts = async () => {
    const response = await axios.get(`${base_url}/api/product`);
    return response.data.data;
  };

  const {
    data: products = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["products"],
    queryFn: fetchProducts,
  });

  const deleteProductMutation = useMutation({
    mutationFn: (id) => axios.delete(`${base_url}/api/product/${id}`),
    onSuccess: () => {
      toast.success("Product deleted successfully");
      queryClient.invalidateQueries(["products"]);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to delete product");
      console.error(err);
    },
  });

  const filteredProducts = products.filter(
    (product) =>
      getLocalizedText(product.name, '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.category && getLocalizedText(product.category.name, '').toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      deleteProductMutation.mutate(id);
    }
  };

  const handleAddProduct = () => {
    navigate("create");
  };

  const handleEditProduct = (product) => {
    navigate(`edit/${product._id}`);
  };

  const handlePreviewProduct = (product) => {
    navigate(`preview/${product._id}`);
  };

  const columns = [
    {
      key: "_id",
      title: "ID",
      render: (row) => row._id.slice(-6),
    },
    {
      key: "name",
      title: "Product Name",
      render: (row) => (
        <div className="flex items-center space-x-3">
          <img
            src={row.coverImage}
            alt={getLocalizedText(row.name, "Product Image")}
            className="w-10 h-10 object-cover rounded"
          />
          <span className="truncate max-w-xs">{getLocalizedText(row.name, "Unnamed Product")}</span>
        </div>
      ),
    },
    {
      key: "category",
      title: "Category",
      render: (row) => row.category ? getLocalizedText(row.category.name, "No Category") : "No Category",
    },
    {
      key: "price",
      title: "Price",
      render: (row) => {
        if (!row.variants || row.variants.length === 0) {
          return "N/A";
        }
        
        const prices = row.variants.flatMap((v) =>
          v.storageOptions ? v.storageOptions.map((o) => o.priceAfterDiscount) : []
        ).filter(price => price !== undefined && price !== null);
        
        if (prices.length === 0) {
          return "N/A";
        }
        
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        return minPrice === maxPrice
          ? `$${minPrice.toFixed(2)}`
          : `$${minPrice.toFixed(2)}`;
      },
    },
    {
      key: "stock",
      title: "Stock",
      render: (row) => (
        <Badge variant={row.totalStock > 0 ? "success" : "error"}>
          {row.totalStock}
        </Badge>
      ),
    },
    {
      key: "status",
      title: "Status",
      render: (row) => {
        const status = row.totalStock > 0 ? "active" : "out-of-stock";
        return (
          <Badge
            className="capitalize"
            variant={
              status === "active"
                ? "success"
                : status === "out-of-stock"
                ? "error"
                : "warning"
            }
          >
            {status}
          </Badge>
        );
      },
    },
    {
      key: "actions",
      title: "Actions",
      render: (row) => (
        <div className="flex space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePreviewProduct(row);
            }}
            className="p-1 text-gray-600 hover:text-gray-800"
          >
            <FiEye className="w-5 h-5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEditProduct(row);
            }}
            className="p-1 text-blue-600 hover:text-blue-800"
          >
            <FiEdit2 className="w-5 h-5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(row._id);
            }}
            className="p-1 text-red-600 hover:text-red-800"
          >
            <FiTrash2 className="w-5 h-5" />
          </button>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center text-red-500">
        <p>Error loading products: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Products</h1>
        <Button onClick={handleAddProduct}>Add Product</Button>
      </div>

      {/* Search and Filters */}
      <div className="flex space-x-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border bg-white border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <select className="px-4 py-2 border bg-white border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500">
          <option value="">All Categories</option>
          <option value="electronics">Electronics</option>
          <option value="clothing">Clothing</option>
          <option value="books">Books</option>
        </select>
      </div>

      <Card>
        <Table columns={columns} data={filteredProducts} />
      </Card>
    </div>
  );
};

export default ProductsPage;
