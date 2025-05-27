import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./App.css";
import { RouterProvider } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./contexts/AuthContext";
import router from "./routes/router";

const queryClient = new QueryClient();

function App() {
  return (
    <>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          {/* <AppRoutes /> */}
          <RouterProvider router={router} />
          <Toaster position="top-right" />
        </AuthProvider>
      </QueryClientProvider>
    </>
  );
}

export default App;
