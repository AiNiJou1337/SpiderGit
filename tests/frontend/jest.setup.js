import '@testing-library/jest-dom';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    }
  },
  usePathname() {
    return '/'
  },
  useSearchParams() {
    return new URLSearchParams()
  },
}))

// Mock Next.js image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} />
  },
}))

// Mock environment variables
process.env.NODE_ENV = 'test'
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'

// Global test utilities
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock fetch
global.fetch = jest.fn()

// Define Response and Request for the test environment
if (typeof Response === 'undefined') {
  global.Response = class Response {
    body;
    status;
    headers;
    
    constructor(body, options) {
      this.body = body;
      this.status = options?.status || 200;
      this.headers = {
        getSetCookie: () => []
      };
    }
    
    json() {
      return Promise.resolve(this.body);
    }
    
    static error() {
      return new Response(null, { status: 0 });
    }
    
    static json(data, init) {
      return new Response(JSON.stringify(data), init);
    }
    
    static redirect(url, status) {
      return new Response(null, { status: status || 302 });
    }
  };
}

if (typeof Request === 'undefined') {
  global.Request = class Request {
    url;
    nextUrl;
    
    constructor(url, options) {
      this.url = url;
      // Add nextUrl for Next.js compatibility
      this.nextUrl = {
        searchParams: {
          get: (key) => {
            return null;
          }
        }
      };
    }
  };
}

// Setup cleanup
afterEach(() => {
  jest.clearAllMocks()
})