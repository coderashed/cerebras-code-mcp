// Model-specific rate limits for each tier (request limits only for now)
export const MODEL_CONFIGS = {
  'gpt-oss-120b': {
    free: {
      contextWindow: 65536,
      limits: {
        requests: { minute: 30, hour: 900, day: 14400 }
        // tokens: { minute: 64000, hour: 1000000, day: 1000000 }
      }
    },
    paid: {
      contextWindow: 65536,
      limits: {
        requests: { minute: 30, hour: 900, day: 14400 }
      }
    }
  },
  'llama-3.3-70b': {
    free: {
      contextWindow: 65536,
      limits: {
        requests: { minute: 30, hour: 900, day: 14400 }
        // tokens: { minute: 64000, hour: 1000000, day: 1000000 }
      }
    },
    paid: {
      contextWindow: 65536,
      limits: {
        requests: { minute: 30, hour: 900, day: 14400 }
      }
    }
  },
  'llama-4-maverick-17b-128e-instruct': {
    free: {
      contextWindow: 8192,
      limits: {
        requests: { minute: 30, hour: 900, day: 14400 }
        // tokens: { minute: 60000, hour: 1000000, day: 1000000 }
      }
    },
    paid: {
      contextWindow: 65536,
      limits: {
        requests: { minute: 30, hour: 900, day: 14400 }
      }
    }
  },
  'llama-4-scout-17b-16e-instruct': {
    free: {
      contextWindow: 8192,
      limits: {
        requests: { minute: 30, hour: 900, day: 14400 }
        // tokens: { minute: 60000, hour: 1000000, day: 1000000 }
      }
    },
    paid: {
      contextWindow: 65536,
      limits: {
        requests: { minute: 30, hour: 900, day: 14400 }
      }
    }
  },
  'llama3.1-8b': {
    free: {
      contextWindow: 8192,
      limits: {
        requests: { minute: 30, hour: 900, day: 14400 }
        // tokens: { minute: 60000, hour: 1000000, day: 1000000 }
      }
    },
    paid: {
      contextWindow: 65536,
      limits: {
        requests: { minute: 30, hour: 900, day: 14400 }
      }
    }
  },
  'qwen-3-235b-a22b-instruct-2507': {
    free: {
      contextWindow: 64000,
      limits: {
        requests: { minute: 30, hour: 900, day: 14400 }
        // tokens: { minute: 60000, hour: 1000000, day: 1000000 }
      }
    },
    paid: {
      contextWindow: 65536,
      limits: {
        requests: { minute: 30, hour: 900, day: 14400 }
      }
    }
  },
  'qwen-3-235b-a22b-thinking-2507': {
    free: {
      contextWindow: 65536,
      limits: {
        requests: { minute: 30, hour: 900, day: 14400 }
        // tokens: { minute: 60000, hour: 1000000, day: 1000000 }
      }
    },
    paid: {
      contextWindow: 65536,
      limits: {
        requests: { minute: 30, hour: 900, day: 14400 }
      }
    }
  },
  'qwen-3-32b': {
    free: {
      contextWindow: 65536,
      limits: {
        requests: { minute: 30, hour: 900, day: 14400 }
        // tokens: { minute: 64000, hour: 1000000, day: 1000000 }
      }
    },
    paid: {
      contextWindow: 65536,
      limits: {
        requests: { minute: 30, hour: 900, day: 14400 }
      }
    }
  },
  'qwen-3-coder-480b': {
    free: {
      contextWindow: 65536,
      limits: {
        requests: { minute: 10, hour: 100, day: 100 }
        // tokens: { minute: 150000, hour: 1000000, day: 1000000 }
      }
    },
    paid: {
      contextWindow: 65536,
      limits: {
        requests: { minute: 30, hour: 900, day: 14400 }
      }
    }
  }
};
