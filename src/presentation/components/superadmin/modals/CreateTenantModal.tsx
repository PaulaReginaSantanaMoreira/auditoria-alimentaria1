"use client";

import React from "react";
import { TenantModal, TenantModalProps } from "./TenantModal";

export type CreateTenantModalProps = Omit<TenantModalProps, "mode">;

export function CreateTenantModal(props: CreateTenantModalProps) {
  return <TenantModal mode="create" {...props} />;
}
