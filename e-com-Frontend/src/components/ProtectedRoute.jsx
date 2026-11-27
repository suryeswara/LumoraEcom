import { useContext } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { ShieldWarning } from "@phosphor-icons/react";
import AuthContext from "../Context/AuthContext";
import Button from "../ui/Button";
import EmptyState from "../ui/EmptyState";

// UX guard only. The real enforcement is on the server: a hidden page still can't call a protected API.
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { isAuthenticated, isAdmin } = useContext(AuthContext);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  if (adminOnly && !isAdmin) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 md:px-6">
        <EmptyState
          icon={ShieldWarning}
          title="This page is for admins"
          actions={
            <Button as={Link} to="/shop">
              Back to the shop
            </Button>
          }
        >
          Your account does not have permission to open it.
        </EmptyState>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
