import { useContext, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bell } from "@phosphor-icons/react";
import axios from "../../axios";
import AuthContext from "../../Context/AuthContext";
import Button from "../../ui/Button";
import { toast } from "../../ui/toast";

const POLL_MS = 30000;

// Admin only. Checks for unread alerts every 30 seconds and tells the admin when a new one arrives.
export default function NotificationBell() {
  const { isAdmin } = useContext(AuthContext);
  const [count, setCount] = useState(0);
  const previous = useRef(null);

  useEffect(() => {
    if (!isAdmin) return undefined;
    let active = true;
    const check = () =>
      axios
        .get("/admin/notifications/unread-count")
        .then(({ data }) => {
          if (!active) return;
          if (previous.current !== null && data.count > previous.current) {
            toast.info("New activity in your store. Open notifications to see it.");
          }
          previous.current = data.count;
          setCount(data.count);
        })
        .catch(() => {});
    check();
    const timer = setInterval(check, POLL_MS);
    const refresh = () => check();
    window.addEventListener("admin:notifications-changed", refresh);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("admin:notifications-changed", refresh);
    };
  }, [isAdmin]);

  if (!isAdmin) return null;

  return (
    <Button
      as={Link}
      to="/admin?tab=notifications"
      variant="ghost"
      icon
      className="relative"
      aria-label={`Notifications, ${count} unread`}
    >
      <Bell size={20} />
      {count > 0 && (
        <span className="caption-3 absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-fg px-1 text-page">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Button>
  );
}
