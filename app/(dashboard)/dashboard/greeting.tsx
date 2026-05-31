"use client";

import { useState, useEffect } from "react";

export function Greeting({ name }: { name: string }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 25000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <p className="text-sm md:text-base text-muted-foreground transition-opacity duration-500">
      Selamat datang, {name}. Berikut ringkasan farm Anda.
    </p>
  );
}
