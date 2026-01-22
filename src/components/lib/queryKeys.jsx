export const queryKeys = {
  calls: {
    all: () => ["calls"],
    detail: (id) => ["calls", id],
    list: (filters) => ["calls", { filters }],
  },
  workQueue: {
    all: () => ["workQueue"],
  },
  vendors: {
    all: () => ["vendors"],
    available: () => ["availableVendors"],
  },
  customers: {
    all: () => ["customers"],
  },
  users: {
    agents: () => ["agents"],
  }
};