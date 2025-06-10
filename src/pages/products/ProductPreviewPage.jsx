import React, { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { base_url } from "../../constants/axiosConfig";
import Badge from "../../components/Badge";
import {
  FiArrowLeft,
  FiX,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";

const ImageModal = ({ image, onClose, allImages, currentImageIndex }) => {
  const modalRef = useRef(null);

  const handlePrevious = (e) => {
    e.stopPropagation();
    if (currentImageIndex > 0) {
      onClose(allImages[currentImageIndex - 1], currentImageIndex - 1);
    }
  };

  const handleNext = (e) => {
    e.stopPropagation();
    if (currentImageIndex < allImages.length - 1) {
      onClose(allImages[currentImageIndex + 1], currentImageIndex + 1);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose(null);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose(null);
      } else if (event.key === "ArrowLeft") {
        handlePrevious(event);
      } else if (event.key === "ArrowRight") {
        handleNext(event);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [currentImageIndex, allImages, onClose]);

  if (!image) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center h-full bg-white/90">
      <button
        onClick={() => onClose(null)}
        className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors z-10"
        aria-label="Close modal"
      >
        <FiX className="w-6 h-6 text-gray-600" />
      </button>
      <div ref={modalRef} className="relative max-w-4xl h-screen p-4">
        <img
          src={image}
          alt="Product preview"
          className="max-w-full max-h-[85vh] object-contain rounded-lg"
        />

        {/* Image Counter */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/80 px-4 py-2 rounded-full shadow-lg text-sm text-gray-600">
          {currentImageIndex + 1} / {allImages.length}
        </div>
      </div>
    </div>
  );
};

const ProductPreviewPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selectedImage, setSelectedImage] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const fetchProduct = async () => {
    const response = await axios.get(`${base_url}/api/product/${id}`);
    return response.data.data;
  };

  const {
    data: product,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["product", id],
    queryFn: fetchProduct,
  });

  const getAllImages = () => {
    if (!product) return [];
    const images = [product.coverImage];
    product.variants.forEach((variant) => {
      variant.images.forEach((image) => {
        if (!images.includes(image)) {
          images.push(image);
        }
      });
    });
    return images;
  };

  const handleImageClick = (image) => {
    const allImages = getAllImages();
    const index = allImages.indexOf(image);
    setSelectedImage(image);
    setCurrentImageIndex(index);
  };

  const handleCloseModal = (newImage = null, newIndex = 0) => {
    if (newImage) {
      setSelectedImage(newImage);
      setCurrentImageIndex(newIndex);
    } else {
      setSelectedImage(null);
      setCurrentImageIndex(0);
    }
  };

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
        <p>Error loading product: {error.message}</p>
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6">
      {/* Image Modal */}
      <ImageModal
        image={selectedImage}
        onClose={handleCloseModal}
        allImages={getAllImages()}
        currentImageIndex={currentImageIndex}
      />

      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <FiArrowLeft className="w-5 h-5" />
        Back to Products
      </button>

      {/* Header with Image and Basic Info */}
      <div className="flex gap-6">
        <div className="w-1/3">
          <img
            src={product.coverImage}
            alt={product.name}
            className="w-64 h-64 object-fill rounded-lg shadow-lg cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => handleImageClick(product.coverImage)}
          />
        </div>
        <div className="w-2/3 space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">{product.name}</h2>
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
            <span className="font-medium">{product.category.name}</span>
            {product.subCategory && (
              <>
                <span className="text-gray-500">•</span>
                <span className="font-medium">{product.subCategory.name}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-600">Brand:</span>
            <span className="font-medium">{product.brand.name}</span>
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
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Product Variants</h3>
        {product.variants.map((variant, index) => (
          <div
            key={index}
            className="border-2 bg-white border-gray-300 rounded-lg p-4"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14">
                <img
                  src={variant.images[0]}
                  alt={variant.color}
                  className="w-full h-full object-contain rounded cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => handleImageClick(variant.images[0])}
                />
              </div>
              <div>
                <h4 className="font-medium">Color: {variant.color}</h4>
                <div className="flex gap-2 mt-1">
                  {variant.images.map((image, imgIndex) => (
                    <img
                      key={imgIndex}
                      src={image}
                      alt={`${variant.color} variant ${imgIndex + 1}`}
                      className="w-8 h-8 object-contain rounded cursor-pointer hover:opacity-75 transition-opacity"
                      onClick={() => handleImageClick(image)}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              {variant.storageOptions.map((option, optIndex) => (
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

      {/* Specifications */}
      {Object.keys(product.specifications).length > 0 && (
        <div className="space-y-4 bg-white p-3 rounded-md border-2 border-gray-300">
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
      <div className="space-y-2 bg-white p-3 rounded-md border-2 border-gray-300">
        <h3 className="text-lg font-semibold">Description</h3>
        <p className="text-gray-600">{product.description}</p>
      </div>

      {/* Additional Info */}
      <div className="grid grid-cols-3 gap-4 text-sm text-gray-500 bg-white p-3 rounded-md border-2 border-gray-300">
        <div>Created: {new Date(product.createdAt).toLocaleDateString()}</div>
        <div>Views: {product.views}</div>
        <div>Sold: {product.sold}</div>
      </div>
    </div>
  );
};

export default ProductPreviewPage;
