import { lazy, Suspense, useEffect } from 'react'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import AppLayout from '@/components/AppLayout'
import { useToasterStore, toast, Toaster } from 'react-hot-toast'
import LoadingOverlay from '@/components/LoadingOverlay'
import '@/index.css'

const LoginPage = lazy(() => import('@/pages/LoginPage'))
const LandingPage = lazy(() => import('@/pages/LandingPage'))
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const ProductsPage = lazy(() => import('@/pages/ProductsPage'))
const CategoriesPage = lazy(() => import('@/pages/CategoriesPage'))
const CategoryProductsPage = lazy(() => import('@/pages/CategoryProductsPage'))
const RomaneioPage = lazy(() => import('@/pages/RomaneioPage'))
const ProfilePage = lazy(() => import('@/pages/ProfilePage'))
const ClientsPage = lazy(() => import('@/pages/ClientsPage'))
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage'))
const MovementsPage = lazy(() => import('@/pages/MovementsPage'))
const SuperAdminPage = lazy(() => import('@/pages/SuperAdminPage'))
const ErrorPage = lazy(() => import('@/pages/ErrorPage'))
const OnboardingPage = lazy(() => import('@/pages/OnboardingPage'))
const TermsPage = lazy(() => import('@/pages/TermsPage'))
const PrivacyPage = lazy(() => import('@/pages/PrivacyPage'))
const CookiesPage = lazy(() => import('@/pages/CookiesPage'))

function RouteLoader() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <LoadingOverlay compact message="Carregando tela" />
    </div>
  )
}

function LazyPage({ children, fallback = <RouteLoader /> }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return <Suspense fallback={fallback}>{children}</Suspense>
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <LoadingOverlay compact message="Preparando sua área" />
      </div>
    )
  }

  return token ? <>{children}</> : <Navigate to="/login" replace />
}

function PublicRoute({ children, loadingFallback }: { children: React.ReactNode; loadingFallback?: React.ReactNode }) {
  const { token, isLoading } = useAuth()

  if (isLoading) {
    if (loadingFallback !== undefined) {
      return <>{loadingFallback}</>
    }

    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <LoadingOverlay compact message="Verificando sessão" />
      </div>
    )
  }

  return token ? <Navigate to="/dashboard" replace /> : <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <LoadingOverlay compact message="Validando acesso" />
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
    element: <LazyPage><LandingPage /></LazyPage>,
    errorElement: <LazyPage><ErrorPage /></LazyPage>,
  },
  {
    path: "/login",
    element: (
      <PublicRoute loadingFallback={null}>
        <LazyPage fallback={null}><LoginPage /></LazyPage>
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
        <LazyPage><ForgotPasswordPage /></LazyPage>
      </PublicRoute>
    ),
  },
  {
    path: "/reset-password",
    element: (
      <PublicRoute>
        <LazyPage><ResetPasswordPage /></LazyPage>
      </PublicRoute>
    ),
  },
  {
    element: (
      <PrivateRoute>
        <AppLayout />
      </PrivateRoute>
    ),
    errorElement: <LazyPage><ErrorPage /></LazyPage>,
    children: [
      {
        path: "/dashboard",
        element: <LazyPage><DashboardPage /></LazyPage>,
      },
      {
        path: "/produtos",
        element: <LazyPage><ProductsPage /></LazyPage>,
      },
      {
        path: "/categorias",
        element: <LazyPage><CategoriesPage /></LazyPage>,
      },
      {
        path: "/categorias/:id",
        element: <LazyPage><CategoryProductsPage /></LazyPage>,
      },
      {
        path: "/clientes",
        element: <LazyPage><ClientsPage /></LazyPage>,
      },
      {
        path: "/romaneio",
        element: <LazyPage><RomaneioPage /></LazyPage>,
      },
      {
        path: "/movimentacoes",
        element: <LazyPage><MovementsPage /></LazyPage>,
      },
      {
        path: "/perfil",
        element: <LazyPage><ProfilePage /></LazyPage>,
      },
      {
        path: "/super-admin",
        element: (
          <AdminRoute>
            <LazyPage><SuperAdminPage /></LazyPage>
          </AdminRoute>
        ),
      },
    ],
  },
  {
    path: "/onboarding",
    element: (
      <PrivateRoute>
        <LazyPage><OnboardingPage /></LazyPage>
      </PrivateRoute>
    ),
  },
  {
    path: "/termos",
    element: <LazyPage><TermsPage /></LazyPage>,
  },
  {
    path: "/privacidade",
    element: <LazyPage><PrivacyPage /></LazyPage>,
  },
  {
    path: "/cookies",
    element: <LazyPage><CookiesPage /></LazyPage>,
  },
  {
    path: "/error",
    element: <LazyPage><ErrorPage /></LazyPage>,
  },
  {
    path: "*",
    element: <LazyPage><ErrorPage code={404} /></LazyPage>,
  },
]);

function App() {
  const { toasts } = useToasterStore();

  useEffect(() => {
    toasts
      .filter((t) => t.visible)
      .slice(0, -2) // Mantém apenas os 2 últimos (mais recentes)
      .forEach((t) => toast.dismiss(t.id));
  }, [toasts]);

  return (
    <>
      <Toaster 
        position="top-right" 
        gutter={8}
        toastOptions={{
          duration: 3000,
        }}
      />
      <RouterProvider router={router} />
    </>
  )
}

export default App
