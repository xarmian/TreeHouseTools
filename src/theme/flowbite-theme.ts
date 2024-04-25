const flowbiteTheme = {
  badge: {
    root: {
      color: {
        primary: "bg-primary-200 text-primary-800 group-hover:bg-primary-300",
      },
      size: {
        xl: "px-3 py-2 text-base rounded-md",
      },
    },
  },
  icon: {
    off: "rounded-full px-2 py-1",
  },
  button: {
    color: {
      primary: "text-white bg-primary-700 hover:bg-primary-800 focus:ring-primary-800",
    },
    outline: {
      on: "transition-all duration-75 ease-in group-hover:bg-opacity-0 group-hover:text-inherit",
    },
    size: {
      md: "text-sm px-3 py-2",
    },
  },
  dropdown: {
    floating: {
      base: "z-10 w-fit rounded-xl divide-y divide-gray-100 shadow",
      content: "rounded-xl text-sm text-gray-700",
      target: "w-fit",
    },
    content: "",
  },
  modal: {
    content: {
      inner: "relative rounded-lg bg-gray-800 shadow",
    },
    header: {
      base: "flex items-start justify-between rounded-t px-5 pt-5",
    },
  },
  navbar: {
    root: {
      base: "fixed z-30 w-full bg-gray-800 border-b border-gray-700",
    },
  },
  sidebar: {
    root: {
      base: "dark flex fixed top-0 left-0 z-20 flex-col flex-shrink-0 pt-16 h-full duration-75 border-r border-gray-700 transition-width",
    },
  },
  textarea: {
    base: "block w-full text-sm p-4 rounded-lg border disabled:cursor-not-allowed disabled:opacity-50",
  },
  toggleSwitch: {
    toggle: {
      checked: {
        off: "!border-gray-600 !bg-gray-700",
      },
    },
  },
};

export default flowbiteTheme;
