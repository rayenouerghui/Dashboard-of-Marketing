"use client";
import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import { LoginModal } from "@/components/auth/LoginModal";
import { useAuth } from "@/context/AuthContext";
import {
  CalenderIcon,
  ChevronDownIcon,
  GridIcon,
  HorizontaLDots,
  ListIcon,
  PieChartIcon,
  UserCircleIcon,
  GroupIcon,
  DocsIcon,
  TaskIcon,
  DollarLineIcon,
} from "../icons/index";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string }[];
  highlight?: boolean;
};

const memberNavItems: NavItem[] = [
  { icon: <GridIcon />, name: "Today Attraction", path: "/member-dashboard" },
  { icon: <DollarLineIcon />, name: "Sales Speech", path: "/member-dashboard/sales" },
  { icon: <CalenderIcon />, name: "Attraction Timeline", path: "/member-dashboard/timeline" },
  { icon: <PieChartIcon />, name: "Ranking", path: "/member-dashboard/ranking" },
  { icon: <DocsIcon />, name: "Resources", path: "/member-dashboard/resources", highlight: true },
];

const navItems: NavItem[] = [
  { icon: <GridIcon />, name: "Dashboard", path: "/dashboard" },
  { icon: <UserCircleIcon />, name: "Universities", path: "/dashboard/universities" },
  { icon: <DollarLineIcon />, name: "Create Opps for Universities", path: "/dashboard/opportunities" },
  { icon: <PieChartIcon />, name: "Conversion Rate", path: "/dashboard/conversion-rate" },
  { icon: <ListIcon />, name: "Digital Attraction", path: "/dashboard/digital-attraction" },
  { icon: <PieChartIcon />, name: "Physical Attractions", path: "/dashboard/physical-attraction" },
  { icon: <CalenderIcon />, name: "Timeline Attraction", path: "/dashboard/timeline" },
  { icon: <CalenderIcon />, name: "Attraction Management", path: "/dashboard/attraction-management" },
  { icon: <PieChartIcon />, name: "Ranking Attraction", path: "/dashboard/ranking" },
  { icon: <TaskIcon />, name: "Booking Post", path: "/dashboard/booking-post" },
];

const othersItems: NavItem[] = [
  { icon: <GroupIcon />, name: "Team", path: "/team" },
  { icon: <DocsIcon />, name: "Resources", path: "/resources" },
  { icon: <TaskIcon />, name: "Goals", path: "/goals" },
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();
  const { role } = useAuth();
  const [openSubmenu, setOpenSubmenu] = useState<{ type: "main" | "others"; index: number } | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>({});
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [, setLogoClicks] = useState(0);
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const isActive = useCallback((path: string) => path === pathname, [pathname]);

  const activeSubmenu = useMemo(() => {
    for (const [menuType, items] of [
      ["main", navItems],
      ["others", othersItems],
    ] as const) {
      for (const [index, nav] of items.entries()) {
        if (nav.subItems?.some((sub) => isActive(sub.path))) {
          return { type: menuType, index } as { type: "main" | "others"; index: number };
        }
      }
    }
    return null;
  }, [isActive]);

  const activeMenuState = openSubmenu ?? activeSubmenu;

  useEffect(() => {
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prev) => ({ ...prev, [key]: subMenuRefs.current[key]?.scrollHeight || 0 }));
      }
    }
  }, [openSubmenu]);

  const handleSubmenuToggle = (index: number, menuType: "main" | "others") => {
    setOpenSubmenu((prev) =>
      prev && prev.type === menuType && prev.index === index ? null : { type: menuType, index }
    );
  };

  const handleLogoClick = () => {
    setLogoClicks((prev) => {
      const next = prev + 1;
      if (next >= 5) {
        setIsLoginOpen(true);
        return 0;
      }
      return next;
    });
  };

  const visibleNavItems = role === "member" ? memberNavItems : navItems;
  const visibleOthersItems = role === "member" ? [] : othersItems;

  const renderMenuItems = (items: NavItem[], menuType: "main" | "others") => (
    <ul className="flex flex-col gap-4">
      {items.map((nav, index) => (
        <li key={nav.name}>
          {nav.subItems ? (
            <button
              onClick={() => handleSubmenuToggle(index, menuType)}
              className={`menu-item group ${
                activeMenuState?.type === menuType && activeMenuState?.index === index ? "menu-item-active" : "menu-item-inactive"
              } cursor-pointer ${!isExpanded && !isHovered ? "lg:justify-center" : "lg:justify-start"}`}
            >
              <span className={activeMenuState?.type === menuType && activeMenuState?.index === index ? "menu-item-icon-active" : "menu-item-icon-inactive"}>
                {nav.icon}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && <span className="menu-item-text">{nav.name}</span>}
              {(isExpanded || isHovered || isMobileOpen) && (
                <ChevronDownIcon className={`ml-auto w-5 h-5 transition-transform duration-200 ${activeMenuState?.type === menuType && activeMenuState?.index === index ? "rotate-180 text-brand-500" : ""}`} />
              )}
            </button>
          ) : (
            nav.path && (
              <Link href={nav.path} className={`menu-item group ${isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"} ${nav.highlight ? "relative" : ""}`}>
                {nav.highlight && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                )}
                <span className={isActive(nav.path) ? "menu-item-icon-active" : "menu-item-icon-inactive"}>{nav.icon}</span>
                {(isExpanded || isHovered || isMobileOpen) && <span className={`menu-item-text ${nav.highlight ? "text-red-600 dark:text-red-400 font-semibold" : ""}`}>{nav.name}</span>}
              </Link>
            )
          )}
          {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
            <div
              ref={(el) => { subMenuRefs.current[`${menuType}-${index}`] = el; }}
              className="overflow-hidden transition-all duration-300"
              style={{ height: activeMenuState?.type === menuType && activeMenuState?.index === index ? `${subMenuHeight[`${menuType}-${index}`]}px` : "0px" }}
            >
              <ul className="mt-2 space-y-1 ml-9">
                {nav.subItems.map((sub) => (
                  <li key={sub.name}>
                    <Link href={sub.path} className={`menu-dropdown-item ${isActive(sub.path) ? "menu-dropdown-item-active" : "menu-dropdown-item-inactive"}`}>
                      {sub.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </li>
      ))}
    </ul>
  );

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200
        ${isExpanded || isMobileOpen ? "w-[290px]" : isHovered ? "w-[290px]" : "w-[90px]"}
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`py-8 flex ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"}`}>
        <button type="button" onClick={handleLogoClick} className="cursor-pointer">
          {isExpanded || isHovered || isMobileOpen ? (
            <>
              <div className="dark:hidden">
                <Image src="/images/logo/aiesec-logo-dark.png" alt="AIESEC" width={130} height={36} loading="eager" />
              </div>
              <div className="hidden dark:block">
                <Image src="/images/logo/aiesec-logo-white.png" alt="AIESEC" width={130} height={36} loading="eager" />
              </div>
            </>
          ) : (
            <Image src="/images/logo/aiesec-logo-dark.png" alt="AIESEC" width={32} height={32} loading="eager" />
          )}
        </button>
      </div>

      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2 className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"}`}>
                {isExpanded || isHovered || isMobileOpen ? "Main" : <HorizontaLDots />}
              </h2>
              {renderMenuItems(visibleNavItems, "main")}
            </div>
            <div>
              <h2 className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"}`}>
                {isExpanded || isHovered || isMobileOpen ? "Management" : <HorizontaLDots />}
              </h2>
              {renderMenuItems(visibleOthersItems, "others")}
            </div>
          </div>
        </nav>

        {(isExpanded || isHovered || isMobileOpen) && (
          <div className="mx-auto mb-10 w-full max-w-60 rounded-2xl bg-blue-50 px-4 py-5 text-center dark:bg-white/[0.03]">
            <div className="mb-2 flex justify-center">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-xs font-bold">LC</span>
            </div>
            <h3 className="mb-1 text-sm font-semibold text-gray-900 dark:text-white">AIESEC LC Tunis</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Operations Dashboard v1.0</p>
          </div>
        )}
      </div>

      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </aside>
  );
};

export default AppSidebar;
