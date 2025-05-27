import { createBrowserRouter } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import DashboardPage from "../pages/dashboard/DashboardPage";
import OrdersPage from "../pages/orders/OrdersPage";
import ProductsPage from "../pages/products/ProductsPage";
import CustomersPage from "../pages/customers/CustomersPage";
import CategoriesPage from "../pages/categories/CategoriesPage";
import BrandsPage from "../pages/brands/BrandsPage";
import LoginPage from "../pages/auth/Login";
import ProtectedRoute from "../components/ProtectedRoute";

const router = createBrowserRouter([
  {
    path: "/dashboard",
    element: (
      <ProtectedRoute role="admin">
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "orders", element: <OrdersPage /> },
      { path: "products", element: <ProductsPage /> },
      { path: "customers", element: <CustomersPage /> },
      { path: "categories", element: <CategoriesPage /> },
      { path: "brands", element: <BrandsPage /> },
    ],
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
]);

export default router;
