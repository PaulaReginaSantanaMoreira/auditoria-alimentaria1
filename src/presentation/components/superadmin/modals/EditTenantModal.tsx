"use client";

import React from "react";
import { TenantModal, TenantModalProps } from "./TenantModal";

export type EditTenantModalProps = Omit<TenantModalProps, "mode">;

export function EditTenantModal(props: EditTenantModalProps) {
  return <TenantModal mode="edit" {...props} />;
}
