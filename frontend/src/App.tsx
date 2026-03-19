import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import LandingPage from './pages/LandingPage'
import DashboardPage from './pages/DashboardPage'
import ProductsPage from './pages/ProductsPage'
import CategoriesPage from './pages/CategoriesPage'
import CategoryProductsPage from './pages/CategoryProductsPage'
import RomaneioPage from './pages/RomaneioPage'
import ProfilePage from './pages/ProfilePage'
import ClientsPage from './pages/ClientsPage'
import AppLayout from './components/AppLayout'
import { Toaster } from 'react-hot-toast'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import MovementsPage from './pages/MovementsPage'
import SuperAdminPage from './pages/SuperAdminPage'
import ErrorPage from './pages/ErrorPage'
import OnboardingPage from './pages/OnboardingPage'
import './index.css'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return token ? <>{children}</> : <Navigate to="/login" replace />
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { token, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return token ? <Navigate to="/dashboard" replace /> : <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user || !user.is_admin) {
    return <Navigate to="/error" replace state={{ code: 404 }} />
  }

  return <>{children}</>
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <LandingPage />,
    errorElement: <ErrorPage />,
  },
  {
    path: "/login",
    element: (
      <PublicRoute>
        <LoginPage />
      </PublicRoute>
    ),
  },
  {
    path: "/cadastro",
    element: <Navigate to="/login" replace />,
  },
  {
    path: "/forgot-password",
    element: (
      <PublicRoute>
        <ForgotPasswordPage />
      </PublicRoute>
    ),
  },
  {
    path: "/reset-password",
    element: (
      <PublicRoute>
        <ResetPasswordPage />
      </PublicRoute>
    ),
  },
  {
    element: (
      <PrivateRoute>
        <AppLayout />
      </PrivateRoute>
    ),
    errorElement: <ErrorPage />,
    children: [
      {
        path: "/dashboard",
        element: <DashboardPage />,
      },
      {
        path: "/produtos",
        element: <ProductsPage />,
      },
      {
        path: "/categorias",
        element: <CategoriesPage />,
      },
      {
        path: "/categorias/:id",
        element: <CategoryProductsPage />,
      },
      {
        path: "/clientes",
        element: <ClientsPage />,
      },
      {
        path: "/romaneio",
        element: <RomaneioPage />,
      },
      {
        path: "/movimentacoes",
        element: <MovementsPage />,
      },
      {
        path: "/perfil",
        element: <ProfilePage />,
      },
      {
        path: "/super-admin",
        element: (
          <AdminRoute>
            <SuperAdminPage />
          </AdminRoute>
        ),
      },
    ],
  },
  {
    path: "/onboarding",
    element: (
      <PrivateRoute>
        <OnboardingPage />
      </PrivateRoute>
    ),
  },
  {
    path: "/error",
    element: <ErrorPage />,
  },
  {
    path: "*",
    element: <ErrorPage code={404} />,
  },
]);

function App() {
  return (
    <>
      <Toaster position="top-right" />
      <RouterProvider router={router} />
    </>
  )
}

export default App
