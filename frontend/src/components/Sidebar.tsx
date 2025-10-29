"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./Sidebar.module.css";

export default function Sidebar() {
  const pathname = usePathname();

  const menuItems = [
    { href: "/dashboard", label: "Dashboard", icon: "🏠" },
    { href: "/search", label: "Partner Finder", icon: "⚙️" },
    { href: "/groups", label: "Groups", icon: "💬" },
    { href: "/progress_tracker", label: "Progress", icon: "📊" },
    { href: "/user_profiles", label: "Profile", icon: "👤" },
  ];

  return (
    <nav className={styles.sidebar}>
      <h1 className={styles.logo}>LockedIn</h1>

      <div className={styles.section}>Main</div>
      <ul className={styles.menu}>
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`${styles.menuButton} ${
                  isActive ? styles.menuButtonActive : ""
                }`}
              >
                <span className={styles.icon}>{item.icon}</span>
                <span className={styles.label}>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
