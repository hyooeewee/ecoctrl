/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createContext, useContext } from "react";

interface SubBreadcrumbContextValue {
  subLabel: string | null;
  setSubLabel: (label: string | null) => void;
}

export const SubBreadcrumbContext = createContext<SubBreadcrumbContextValue>({
  subLabel: null,
  setSubLabel: () => {},
});

export function useSubBreadcrumb() {
  return useContext(SubBreadcrumbContext);
}
