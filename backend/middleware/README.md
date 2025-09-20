# Middleware System

This middleware system is designed to follow C# patterns for organizing and managing Express.js middleware in a structured, maintainable way.

## Architecture

The middleware system consists of:

1. **Individual Middleware Classes** - Each middleware is encapsulated in its own class
2. **Pipeline Manager** - Manages the registration and execution order of middleware
3. **Default Configuration** - Pre-configured pipeline with standard middleware

## Middleware Classes

### 1. SecurityMiddleware
- **Purpose**: Handles security-related headers and configurations
- **C# Equivalent**: `UseSecurityHeaders()` or `SecurityMiddleware`
- **Features**: Helmet configuration, CSP headers

### 2. CorsMiddleware
- **Purpose**: Handles Cross-Origin Resource Sharing
- **C# Equivalent**: `UseCors()` or `CorsMiddleware`
- **Features**: Configurable origins, credentials support

### 3. BodyParserMiddleware
- **Purpose**: Handles request body parsing
- **C# Equivalent**: `UseBodyParsing()` or `ConfigureBodyParsing()`
- **Features**: JSON, URL-encoded, and raw body parsing with size limits

### 4. RateLimitMiddleware
- **Purpose**: Handles request rate limiting
- **C# Equivalent**: `UseRateLimiting()` or `ConfigureRateLimiting()`
- **Features**: IP-based rate limiting, custom limiters

### 5. LoggingMiddleware
- **Purpose**: Handles request/response logging
- **C# Equivalent**: `UseRequestLogging()` or `ConfigureLogging()`
- **Features**: Request ID generation, duration tracking

### 6. ErrorHandlingMiddleware
- **Purpose**: Handles application-wide error processing
- **C# Equivalent**: `UseExceptionHandler()` or `ConfigureExceptionHandling()`
- **Features**: Global error handling, 404 handling, async error wrapper

## Usage

### Default Pipeline (Recommended)

```javascript
import MiddlewarePipeline from './middleware/middlewarePipeline.js';

// Create default pipeline with standard middleware
const middlewarePipeline = MiddlewarePipeline.createDefault();
middlewarePipeline.configure(app);
```

### Custom Pipeline

```javascript
import MiddlewarePipeline from './middleware/middlewarePipeline.js';
import SecurityMiddleware from './middleware/securityMiddleware.js';
import CorsMiddleware from './middleware/corsMiddleware.js';

// Create custom pipeline
const pipeline = new MiddlewarePipeline();

pipeline
  .use(new SecurityMiddleware(), 1)  // Execute first
  .use(new CorsMiddleware(), 2)      // Execute second
  .use(new CustomMiddleware(), 10);  // Custom middleware

pipeline.configure(app);
```

## C# Comparison

This middleware system follows C# patterns:

### C# Startup.cs
```csharp
public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
{
    app.UseSecurityHeaders();
    app.UseCors();
    app.UseBodyParsing();
    app.UseRequestLogging();
    app.UseRateLimiting();
    app.UseRouting();
    app.UseEndpoints(endpoints => {
        endpoints.MapControllers();
    });
    app.UseExceptionHandler();
}
```

### JavaScript app.js
```javascript
// Equivalent functionality achieved through middleware pipeline
const middlewarePipeline = MiddlewarePipeline.createDefault();
middlewarePipeline.configure(app);
app.use('/', routes);
```

## Benefits

1. **Separation of Concerns**: Each middleware has a single responsibility
2. **Testability**: Individual middleware can be unit tested
3. **Maintainability**: Easy to add, remove, or modify middleware
4. **Order Management**: Explicit control over middleware execution order
5. **C# Familiarity**: Similar patterns to C# middleware configuration
6. **Reusability**: Middleware can be reused across different applications

## Adding New Middleware

1. Create a new middleware class following the pattern:

```javascript
class MyCustomMiddleware {
  constructor() {
    this.name = 'MyCustomMiddleware';
  }

  configure(app) {
    console.log(`🔧 Configuring ${this.name}...`);
    app.use((req, res, next) => {
      // Your middleware logic here
      next();
    });
    console.log(`✅ ${this.name} configured successfully`);
  }
}
```

2. Register it in the pipeline:

```javascript
const pipeline = new MiddlewarePipeline();
pipeline.use(new MyCustomMiddleware(), 5); // Order 5
pipeline.configure(app);
```

## Environment Configuration

Middleware can be configured via environment variables:

- `RATE_LIMIT_WINDOW_MS`: Rate limiting window (default: 15 minutes)
- `RATE_LIMIT_MAX_REQUESTS`: Max requests per window (default: 100)
- `FRONTEND_URL`: Allowed frontend URL for CORS
- `NODE_ENV`: Environment (affects error detail visibility)
