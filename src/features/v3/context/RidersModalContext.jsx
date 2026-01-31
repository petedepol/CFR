// RidersModalContext.jsx - Global control for RidersModal across V3 pages

import { createContext, useContext, useState } from "react";

const RidersModalContext = createContext();

export function RidersModalProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);

  return (
    <RidersModalContext.Provider value={{ isOpen, open, close, setIsOpen }}>
      {children}
    </RidersModalContext.Provider>
  );
}

export function useRidersModal() {
  const context = useContext(RidersModalContext);
  if (!context) {
    throw new Error("useRidersModal must be used within RidersModalProvider");
  }
  return context;
}
