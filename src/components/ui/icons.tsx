"use client";

import * as React from "react";
import { motion, type Variants } from "motion/react";
import {
  getVariants,
  useAnimateIconContext,
  IconWrapper,
  type IconProps,
} from "@animate-ui/react/icons";

export type BaseIconProps = IconProps<string>;

function makeIcon<T extends Record<string, Variants>>(
  animations: { default: T; [key: string]: T },
  renderSvg: (variants: T, controls: any, props: BaseIconProps) => React.ReactNode
) {
  function IconComponent(props: BaseIconProps) {
    const { controls } = useAnimateIconContext();
    const variants = getVariants(animations) as T;
    return renderSvg(variants, controls, props);
  }

  return function AnimatedIcon(props: BaseIconProps) {
    return (
      <IconWrapper
        icon={IconComponent}
        animateOnHover={props.animateOnHover ?? true}
        {...props}
      />
    );
  };
}

// 1. CalendarIcon
const calendarAnim = {
  default: {
    group: {
      initial: { rotate: 0, y: 0 },
      animate: {
        rotate: [0, -4, 4, -2, 0],
        y: [0, -1.5, 0],
        transformOrigin: "top center",
        transition: { duration: 0.6, ease: "easeInOut" },
      },
    },
  } satisfies Record<string, Variants>,
} as const;

export const CalendarIcon = makeIcon(calendarAnim, (v, controls, props) => (
  <motion.svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    variants={v.group}
    initial="initial"
    animate={controls}
    {...props}
  >
    <path d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
  </motion.svg>
));

// 2. ClockIcon
const clockAnim = {
  default: {
    group: {},
    hand: {
      initial: { rotate: 0 },
      animate: {
        rotate: [0, 360],
        transformOrigin: "12px 12px",
        transition: { duration: 0.8, ease: "easeInOut" },
      },
    },
  } satisfies Record<string, Variants>,
} as const;

export const ClockIcon = makeIcon(clockAnim, (v, controls, props) => (
  <motion.svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    variants={v.group}
    initial="initial"
    animate={controls}
    {...props}
  >
    <path d="M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18Z" />
    <motion.path
      d="M12 6v6l4.5 2"
      variants={v.hand}
      initial="initial"
      animate={controls}
    />
  </motion.svg>
));

// 3. UserIcon
const userAnim = {
  default: {
    group: {
      initial: { y: 0 },
      animate: {
        y: [0, -2, 0],
        transition: { duration: 0.5, ease: "easeInOut" },
      },
    },
  } satisfies Record<string, Variants>,
} as const;

export const UserIcon = makeIcon(userAnim, (v, controls, props) => (
  <motion.svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    variants={v.group}
    initial="initial"
    animate={controls}
    {...props}
  >
    <path d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
  </motion.svg>
));

// 4. UsersIcon
const usersAnim = {
  default: {
    group: {
      initial: { y: 0, scale: 1 },
      animate: {
        y: [0, -2, 0],
        scale: [1, 1.04, 1],
        transformOrigin: "bottom center",
        transition: { duration: 0.6, ease: "easeInOut" },
      },
    },
  } satisfies Record<string, Variants>,
} as const;

export const UsersIcon = makeIcon(usersAnim, (v, controls, props) => (
  <motion.svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    variants={v.group}
    initial="initial"
    animate={controls}
    {...props}
  >
    <path d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
  </motion.svg>
));

// 5. ChartBarIcon
const chartAnim = {
  default: {
    group: {},
    bar1: {
      initial: { scaleY: 1 },
      animate: {
        scaleY: [1, 1.3, 1],
        transformOrigin: "bottom center",
        transition: { duration: 0.5, delay: 0, ease: "easeInOut" },
      },
    },
    bar2: {
      initial: { scaleY: 1 },
      animate: {
        scaleY: [1, 1.3, 1],
        transformOrigin: "bottom center",
        transition: { duration: 0.5, delay: 0.1, ease: "easeInOut" },
      },
    },
    bar3: {
      initial: { scaleY: 1 },
      animate: {
        scaleY: [1, 1.3, 1],
        transformOrigin: "bottom center",
        transition: { duration: 0.5, delay: 0.2, ease: "easeInOut" },
      },
    },
  } satisfies Record<string, Variants>,
} as const;

export const ChartBarIcon = makeIcon(chartAnim, (v, controls, props) => (
  <motion.svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    variants={v.group}
    initial="initial"
    animate={controls}
    {...props}
  >
    <motion.path
      d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75Z"
      variants={v.bar1}
      initial="initial"
      animate={controls}
    />
    <motion.path
      d="M9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625Z"
      variants={v.bar2}
      initial="initial"
      animate={controls}
    />
    <motion.path
      d="M16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
      variants={v.bar3}
      initial="initial"
      animate={controls}
    />
  </motion.svg>
));

// 6. CogIcon
const cogAnim = {
  default: {
    group: {
      initial: { rotate: 0 },
      animate: {
        rotate: [0, 90],
        transformOrigin: "center",
        transition: { duration: 0.7, ease: "easeInOut" },
      },
    },
  } satisfies Record<string, Variants>,
} as const;

export const CogIcon = makeIcon(cogAnim, (v, controls, props) => (
  <motion.svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    variants={v.group}
    initial="initial"
    animate={controls}
    {...props}
  >
    <path d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.6 6.6 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
    <path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
  </motion.svg>
));

// 7. CheckCircleIcon
const checkCircleAnim = {
  default: {
    group: {},
    check: {
      initial: { scale: 1 },
      animate: {
        scale: [1, 1.25, 1],
        transformOrigin: "center",
        transition: { duration: 0.5, ease: "easeInOut" },
      },
    },
  } satisfies Record<string, Variants>,
} as const;

export const CheckCircleIcon = makeIcon(checkCircleAnim, (v, controls, props) => (
  <motion.svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    variants={v.group}
    initial="initial"
    animate={controls}
    {...props}
  >
    <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    <motion.path
      d="m9 12.75 2.25 2.25 3.75-5.25"
      variants={v.check}
      initial="initial"
      animate={controls}
    />
  </motion.svg>
));

// 8. XCircleIcon
const xCircleAnim = {
  default: {
    group: {},
    cross: {
      initial: { rotate: 0 },
      animate: {
        rotate: [0, -12, 12, -6, 0],
        transformOrigin: "center",
        transition: { duration: 0.5, ease: "easeInOut" },
      },
    },
  } satisfies Record<string, Variants>,
} as const;

export const XCircleIcon = makeIcon(xCircleAnim, (v, controls, props) => (
  <motion.svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    variants={v.group}
    initial="initial"
    animate={controls}
    {...props}
  >
    <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    <motion.path
      d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5"
      variants={v.cross}
      initial="initial"
      animate={controls}
    />
  </motion.svg>
));

// 9. PlusIcon
const plusAnim = {
  default: {
    group: {
      initial: { rotate: 0 },
      animate: {
        rotate: [0, 90],
        transformOrigin: "center",
        transition: { duration: 0.4, ease: "easeInOut" },
      },
    },
  } satisfies Record<string, Variants>,
} as const;

export const PlusIcon = makeIcon(plusAnim, (v, controls, props) => (
  <motion.svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    variants={v.group}
    initial="initial"
    animate={controls}
    {...props}
  >
    <path d="M12 4.5v15m7.5-7.5h-15" />
  </motion.svg>
));

// 10. KeyIcon
const keyAnim = {
  default: {
    group: {
      initial: { rotate: 0 },
      animate: {
        rotate: [0, 25, -10, 0],
        transformOrigin: "16px 8px",
        transition: { duration: 0.6, ease: "easeInOut" },
      },
    },
  } satisfies Record<string, Variants>,
} as const;

export const KeyIcon = makeIcon(keyAnim, (v, controls, props) => (
  <motion.svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    variants={v.group}
    initial="initial"
    animate={controls}
    {...props}
  >
    <path d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
  </motion.svg>
));

// 11. ShieldCheckIcon
const shieldAnim = {
  default: {
    group: {},
    check: {
      initial: { scale: 1 },
      animate: {
        scale: [1, 1.25, 1],
        transformOrigin: "center",
        transition: { duration: 0.5, ease: "easeInOut" },
      },
    },
  } satisfies Record<string, Variants>,
} as const;

export const ShieldCheckIcon = makeIcon(shieldAnim, (v, controls, props) => (
  <motion.svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    variants={v.group}
    initial="initial"
    animate={controls}
    {...props}
  >
    <path d="M12 2.713A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
    <motion.path
      d="M9 12.75 11.25 15 15 9.75"
      variants={v.check}
      initial="initial"
      animate={controls}
    />
  </motion.svg>
));

// 12. ArrowDownTrayIcon
const trayAnim = {
  default: {
    group: {},
    arrow: {
      initial: { y: 0 },
      animate: {
        y: [0, 3.5, 0],
        transition: { duration: 0.6, ease: "easeInOut" },
      },
    },
  } satisfies Record<string, Variants>,
} as const;

export const ArrowDownTrayIcon = makeIcon(trayAnim, (v, controls, props) => (
  <motion.svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    variants={v.group}
    initial="initial"
    animate={controls}
    {...props}
  >
    <path d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5" />
    <motion.path
      d="M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
      variants={v.arrow}
      initial="initial"
      animate={controls}
    />
  </motion.svg>
));

// 13. ArrowTrendingUpIcon
const trendAnim = {
  default: {
    group: {},
    arrow: {
      initial: { x: 0, y: 0 },
      animate: {
        x: [0, 2.5, 0],
        y: [0, -2.5, 0],
        transition: { duration: 0.6, ease: "easeInOut" },
      },
    },
  } satisfies Record<string, Variants>,
} as const;

export const ArrowTrendingUpIcon = makeIcon(trendAnim, (v, controls, props) => (
  <motion.svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    variants={v.group}
    initial="initial"
    animate={controls}
    {...props}
  >
    <motion.path
      d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941"
      variants={v.arrow}
      initial="initial"
      animate={controls}
    />
  </motion.svg>
));

// 14. BanknotesIcon
const bankAnim = {
  default: {
    group: {
      initial: { rotate: 0 },
      animate: {
        rotate: [0, -6, 6, 0],
        transformOrigin: "center",
        transition: { duration: 0.7, ease: "easeInOut" },
      },
    },
  } satisfies Record<string, Variants>,
} as const;

export const BanknotesIcon = makeIcon(bankAnim, (v, controls, props) => (
  <motion.svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    variants={v.group}
    initial="initial"
    animate={controls}
    {...props}
  >
    <path d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6H2.25m0 0v8.25m0 0c.75 0 1.5.06 2.25.176M3 6.75h18m0 0v8.25m0 0c-.75 0-1.5.06-2.25.176M21 6.75A2.25 2.25 0 0 0 18.75 4.5h-13.5A2.25 2.25 0 0 0 3 6.75m18 0a2.25 2.25 0 0 1 2.25 2.25v6a2.25 2.25 0 0 1-2.25 2.25m0 0v2.25a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 19.5v-2.25m18 0a2.25 2.25 0 0 0 2.25-2.25v-6a2.25 2.25 0 0 0-2.25-2.25M12 9.75a2.25 2.25 0 1 0 0 4.5 2.25 2.25 0 0 0 0-4.5Z" />
  </motion.svg>
));

// 15. BuildingOfficeIcon
const buildingAnim = {
  default: {
    group: {
      initial: { scale: 1 },
      animate: {
        scale: [1, 1.06, 1],
        transformOrigin: "bottom center",
        transition: { duration: 0.6, ease: "easeInOut" },
      },
    },
  } satisfies Record<string, Variants>,
} as const;

export const BuildingOfficeIcon = makeIcon(buildingAnim, (v, controls, props) => (
  <motion.svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    variants={v.group}
    initial="initial"
    animate={controls}
    {...props}
  >
    <path d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
  </motion.svg>
));

// 16. EyeIcon
const eyeAnim = {
  default: {
    group: {},
    pupil: {
      initial: { scaleY: 1 },
      animate: {
        scaleY: [1, 0.2, 1],
        transformOrigin: "center",
        transition: { duration: 0.5, ease: "easeInOut" },
      },
    },
  } satisfies Record<string, Variants>,
} as const;

export const EyeIcon = makeIcon(eyeAnim, (v, controls, props) => (
  <motion.svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    variants={v.group}
    initial="initial"
    animate={controls}
    {...props}
  >
    <motion.path
      d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
      variants={v.pupil}
      initial="initial"
      animate={controls}
    />
    <path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
  </motion.svg>
));

// 17. EyeSlashIcon
const eyeSlashAnim = {
  default: {
    group: {},
    slash: {
      initial: { rotate: 0 },
      animate: {
        rotate: [0, -6, 6, 0],
        transformOrigin: "center",
        transition: { duration: 0.6, ease: "easeInOut" },
      },
    },
  } satisfies Record<string, Variants>,
} as const;

export const EyeSlashIcon = makeIcon(eyeSlashAnim, (v, controls, props) => (
  <motion.svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    variants={v.group}
    initial="initial"
    animate={controls}
    {...props}
  >
    <path d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3" />
    <motion.path
      d="m3 3 18 18"
      variants={v.slash}
      initial="initial"
      animate={controls}
    />
    <path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
  </motion.svg>
));

// 18. ArrowPathIcon
const pathAnim = {
  default: {
    group: {
      initial: { rotate: 0 },
      animate: {
        rotate: [0, 360],
        transformOrigin: "center",
        transition: { duration: 0.75, ease: "easeInOut" },
      },
    },
  } satisfies Record<string, Variants>,
} as const;

export const ArrowPathIcon = makeIcon(pathAnim, (v, controls, props) => (
  <motion.svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    variants={v.group}
    initial="initial"
    animate={controls}
    {...props}
  >
    <path d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
  </motion.svg>
));

// 19. TrashIcon
const trashAnim = {
  default: {
    group: {},
    lid: {
      initial: { y: 0, rotate: 0 },
      animate: {
        y: [0, -3, 0],
        rotate: [0, -8, 0],
        transformOrigin: "left center",
        transition: { duration: 0.5, ease: "easeInOut" },
      },
    },
  } satisfies Record<string, Variants>,
} as const;

export const TrashIcon = makeIcon(trashAnim, (v, controls, props) => (
  <motion.svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    variants={v.group}
    initial="initial"
    animate={controls}
    {...props}
  >
    <path d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397" />
    <motion.path
      d="M9 5.25v-.916c0-1.18.91-2.164 2.09-2.201a51.964 51.964 0 0 1 3.32 0c1.18.037 2.09 1.022 2.09 2.201v.916m-7.5 0h7.5"
      variants={v.lid}
      initial="initial"
      animate={controls}
    />
  </motion.svg>
));

// 20. MagnifyingGlassIcon
const searchAnim = {
  default: {
    group: {
      initial: { rotate: 0, scale: 1 },
      animate: {
        rotate: [0, -12, 12, 0],
        scale: [1, 1.1, 1],
        transformOrigin: "center",
        transition: { duration: 0.6, ease: "easeInOut" },
      },
    },
  } satisfies Record<string, Variants>,
} as const;

export const MagnifyingGlassIcon = makeIcon(searchAnim, (v, controls, props) => (
  <motion.svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    variants={v.group}
    initial="initial"
    animate={controls}
    {...props}
  >
    <path d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
  </motion.svg>
));

// 21. DocumentTextIcon
const docAnim = {
  default: {
    group: {},
    lines: {
      initial: { x: 0 },
      animate: {
        x: [0, 2, 0],
        transition: { duration: 0.5, ease: "easeInOut" },
      },
    },
  } satisfies Record<string, Variants>,
} as const;

export const DocumentTextIcon = makeIcon(docAnim, (v, controls, props) => (
  <motion.svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    variants={v.group}
    initial="initial"
    animate={controls}
    {...props}
  >
    <path d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m10.5 15H5.625c-.621 0-1.125-.504-1.125-1.125v-15c0-.621.504-1.125 1.125-1.125h4.875" />
    <motion.path
      d="M8.25 13.5h7.5m-7.5 3H12"
      variants={v.lines}
      initial="initial"
      animate={controls}
    />
  </motion.svg>
));

// 22. FunnelIcon
const funnelAnim = {
  default: {
    group: {
      initial: { rotate: 0 },
      animate: {
        rotate: [0, -8, 8, -4, 0],
        transformOrigin: "top center",
        transition: { duration: 0.6, ease: "easeInOut" },
      },
    },
  } satisfies Record<string, Variants>,
} as const;

export const FunnelIcon = makeIcon(funnelAnim, (v, controls, props) => (
  <motion.svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    variants={v.group}
    initial="initial"
    animate={controls}
    {...props}
  >
    <path d="M12 3c2.755 0 5.455.232 8.083.678.539.092.917.56.917 1.107v1.892a2.25 2.25 0 0 1-.659 1.59l-5.433 5.432a2.25 2.25 0 0 0-.659 1.59v3.027c0 .414-.228.794-.597.99l-2.25 1.2A1.125 1.125 0 0 1 9.75 19.5v-4.188a2.25 2.25 0 0 0-.659-1.59L3.659 8.267A2.25 2.25 0 0 1 3 6.677V4.785c0-.547.378-1.015.917-1.107a48.533 48.533 0 0 1 8.083-.678Z" />
  </motion.svg>
));

// 23. InformationCircleIcon
const infoAnim = {
  default: {
    group: {},
    dot: {
      initial: { y: 0 },
      animate: {
        y: [0, -2, 0],
        transition: { duration: 0.5, ease: "easeInOut" },
      },
    },
  } satisfies Record<string, Variants>,
} as const;

export const InformationCircleIcon = makeIcon(infoAnim, (v, controls, props) => (
  <motion.svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    variants={v.group}
    initial="initial"
    animate={controls}
    {...props}
  >
    <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    <path d="M12 11.25v4.5" />
    <motion.path
      d="M12 8.25h.008v.008H12V8.25Z"
      variants={v.dot}
      initial="initial"
      animate={controls}
    />
  </motion.svg>
));

// 24. ChevronDownIcon
const chevronDownAnim = {
  default: {
    group: {
      initial: { y: 0 },
      animate: {
        y: [0, 2.5, 0],
        transition: { duration: 0.45, ease: "easeInOut" },
      },
    },
  } satisfies Record<string, Variants>,
} as const;

export const ChevronDownIcon = makeIcon(chevronDownAnim, (v, controls, props) => (
  <motion.svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    variants={v.group}
    initial="initial"
    animate={controls}
    {...props}
  >
    <path d="m19.5 8.25-7.5 7.5-7.5-7.5" />
  </motion.svg>
));

// 25. ChevronUpIcon
const chevronUpAnim = {
  default: {
    group: {
      initial: { y: 0 },
      animate: {
        y: [0, -2.5, 0],
        transition: { duration: 0.45, ease: "easeInOut" },
      },
    },
  } satisfies Record<string, Variants>,
} as const;

export const ChevronUpIcon = makeIcon(chevronUpAnim, (v, controls, props) => (
  <motion.svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    variants={v.group}
    initial="initial"
    animate={controls}
    {...props}
  >
    <path d="m4.5 15.75 7.5-7.5 7.5 7.5" />
  </motion.svg>
));

// 26. ChevronLeftIcon
const chevronLeftAnim = {
  default: {
    group: {
      initial: { x: 0 },
      animate: {
        x: [0, -2.5, 0],
        transition: { duration: 0.45, ease: "easeInOut" },
      },
    },
  } satisfies Record<string, Variants>,
} as const;

export const ChevronLeftIcon = makeIcon(chevronLeftAnim, (v, controls, props) => (
  <motion.svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    variants={v.group}
    initial="initial"
    animate={controls}
    {...props}
  >
    <path d="M15.75 19.5 8.25 12l7.5-7.5" />
  </motion.svg>
));

// 27. ChevronRightIcon
const chevronRightAnim = {
  default: {
    group: {
      initial: { x: 0 },
      animate: {
        x: [0, 2.5, 0],
        transition: { duration: 0.45, ease: "easeInOut" },
      },
    },
  } satisfies Record<string, Variants>,
} as const;

export const ChevronRightIcon = makeIcon(chevronRightAnim, (v, controls, props) => (
  <motion.svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    variants={v.group}
    initial="initial"
    animate={controls}
    {...props}
  >
    <path d="m8.25 4.5 7.5 7.5-7.5 7.5" />
  </motion.svg>
));

// 28. ExclamationTriangleIcon
const warningAnim = {
  default: {
    group: {
      initial: { rotate: 0 },
      animate: {
        rotate: [0, -8, 8, -4, 0],
        transformOrigin: "bottom center",
        transition: { duration: 0.6, ease: "easeInOut" },
      },
    },
  } satisfies Record<string, Variants>,
} as const;

export const ExclamationTriangleIcon = makeIcon(warningAnim, (v, controls, props) => (
  <motion.svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    variants={v.group}
    initial="initial"
    animate={controls}
    {...props}
  >
    <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
  </motion.svg>
));

// 29. Squares2X2Icon
const gridAnim = {
  default: {
    group: {
      initial: { scale: 1 },
      animate: {
        scale: [1, 1.08, 1],
        transformOrigin: "center",
        transition: { duration: 0.5, ease: "easeInOut" },
      },
    },
  } satisfies Record<string, Variants>,
} as const;

export const Squares2X2Icon = makeIcon(gridAnim, (v, controls, props) => (
  <motion.svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    variants={v.group}
    initial="initial"
    animate={controls}
    {...props}
  >
    <path d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
  </motion.svg>
));

// 30. Bars3BottomLeftIcon
const barsAnim = {
  default: {
    group: {},
    bar: {
      initial: { x: 0 },
      animate: {
        x: [0, 3, 0],
        transition: { duration: 0.5, ease: "easeInOut" },
      },
    },
  } satisfies Record<string, Variants>,
} as const;

export const Bars3BottomLeftIcon = makeIcon(barsAnim, (v, controls, props) => (
  <motion.svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    variants={v.group}
    initial="initial"
    animate={controls}
    {...props}
  >
    <path d="M3.75 6.75h16.5M3.75 12h16.5" />
    <motion.path
      d="M3.75 17.25H12"
      variants={v.bar}
      initial="initial"
      animate={controls}
    />
  </motion.svg>
));

// 31. CalendarDaysIcon
const daysAnim = {
  default: {
    group: {
      initial: { y: 0 },
      animate: {
        y: [0, -2, 0],
        transition: { duration: 0.5, ease: "easeInOut" },
      },
    },
  } satisfies Record<string, Variants>,
} as const;

export const CalendarDaysIcon = makeIcon(daysAnim, (v, controls, props) => (
  <motion.svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    variants={v.group}
    initial="initial"
    animate={controls}
    {...props}
  >
    <path d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z" />
  </motion.svg>
));

// 32. BellIcon
const bellAnim = {
  default: {
    bell: {
      initial: { rotate: 0 },
      animate: {
        rotate: [0, -12, 12, -8, 8, -4, 4, 0],
        transformOrigin: "top center",
        transition: { duration: 0.6, ease: "easeInOut" },
      },
    },
  } satisfies Record<string, Variants>,
} as const;

export const BellIcon = makeIcon(bellAnim, (v, controls, props) => (
  <motion.svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    variants={v.bell}
    initial="initial"
    animate={controls}
    {...props}
  >
    <path d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
  </motion.svg>
));
