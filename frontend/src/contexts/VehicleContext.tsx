import { createContext, useContext, useState } from "react";

interface VehicleContextValue {
  selectedVin: string | null;
  setSelectedVin: (vin: string) => void;
}

const VehicleContext = createContext<VehicleContextValue>({
  selectedVin: null,
  setSelectedVin: () => {},
});

export function VehicleProvider({ children }: { children: React.ReactNode }) {
  const [selectedVin, setSelectedVinState] = useState<string | null>(
    () => localStorage.getItem("selectedVin")
  );

  function setSelectedVin(vin: string) {
    localStorage.setItem("selectedVin", vin);
    setSelectedVinState(vin);
  }

  return (
    <VehicleContext.Provider value={{ selectedVin, setSelectedVin }}>
      {children}
    </VehicleContext.Provider>
  );
}

export function useVehicle() {
  return useContext(VehicleContext);
}
