import { queryOptions } from "@tanstack/react-query"

import {
  createOrderServerFn,
  getOrderServerFn,
  getPricesServerFn,
  getProductServerFn,
  listCatalogsServerFn,
  searchProductsServerFn,
} from "~/lib/gelato/fns"
import {
  createOrderSchema,
  getOrderSchema,
  getPricesSchema,
  getProductSchema,
  searchProductsSchema,
} from "~/lib/gelato/schemas"
import { type ServerFnData } from "~/lib/types"

export const gelato = {
  catalogs: {
    list: {
      fn: listCatalogsServerFn,
      queryOptions: () =>
        queryOptions({
          queryKey: ["gelato.catalogs.list"],
          queryFn: () => listCatalogsServerFn(),
        }),
    },
  },
  products: {
    search: {
      fn: searchProductsServerFn,
      schema: searchProductsSchema,
      queryOptions: (data: ServerFnData<typeof searchProductsServerFn>) =>
        queryOptions({
          queryKey: ["gelato.products.search", data],
          queryFn: () => searchProductsServerFn({ data }),
        }),
    },
    get: {
      fn: getProductServerFn,
      schema: getProductSchema,
      queryOptions: (data: ServerFnData<typeof getProductServerFn>) =>
        queryOptions({
          queryKey: ["gelato.products.get", data],
          queryFn: () => getProductServerFn({ data }),
        }),
    },
    prices: {
      fn: getPricesServerFn,
      schema: getPricesSchema,
      queryOptions: (data: ServerFnData<typeof getPricesServerFn>) =>
        queryOptions({
          queryKey: ["gelato.products.prices", data],
          queryFn: () => getPricesServerFn({ data }),
        }),
    },
  },
  orders: {
    create: {
      fn: createOrderServerFn,
      schema: createOrderSchema,
    },
    get: {
      fn: getOrderServerFn,
      schema: getOrderSchema,
      queryOptions: (data: ServerFnData<typeof getOrderServerFn>) =>
        queryOptions({
          queryKey: ["gelato.orders.get", data],
          queryFn: () => getOrderServerFn({ data }),
        }),
    },
  },
}
