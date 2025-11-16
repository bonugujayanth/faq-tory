const { errorHandler } = require('../middleware/error');

describe('Error Middleware Tests', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    mockNext = jest.fn();
  });

  describe('errorHandler', () => {
    it('should handle error with default status 500', () => {
      const error = new Error('Test error');
      errorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalled();
    });

    it('should return public message from error object', () => {
      const error = new Error('Internal error');
      error.publicMessage = 'An error occurred';
      error.status = 400;
      
      errorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      const jsonCall = mockRes.json.mock.calls[0][0];
      expect(jsonCall.message).toBe('An error occurred');
    });

    it('should include error details in development mode', () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Development error');
      error.publicMessage = 'Public message';
      error.status = 400;
      
      errorHandler(error, mockReq, mockRes, mockNext);
      
      const jsonCall = mockRes.json.mock.calls[0][0];
      expect(jsonCall.error).toBe('Development error');
      
      delete process.env.NODE_ENV;
    });

    it('should not include error details in production mode', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Production error');
      error.publicMessage = 'Public message';
      error.status = 500;
      
      errorHandler(error, mockReq, mockRes, mockNext);
      
      const jsonCall = mockRes.json.mock.calls[0][0];
      expect(jsonCall.error).toBeUndefined();
      
      delete process.env.NODE_ENV;
    });

    it('should use error.status if provided', () => {
      const error = new Error('Custom status error');
      error.status = 403;
      error.publicMessage = 'Forbidden';
      
      errorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should handle errors without publicMessage', () => {
      const error = new Error('No public message');
      error.status = 404;
      
      errorHandler(error, mockReq, mockRes, mockNext);
      
      const jsonCall = mockRes.json.mock.calls[0][0];
      expect(jsonCall.message).toBe('Server error');
    });

    it('should handle errors without status', () => {
      const error = new Error('No status error');
      
      errorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    it('should handle validation errors (422)', () => {
      const error = new Error('Validation failed');
      error.status = 422;
      error.publicMessage = 'Invalid input';
      
      errorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(422);
      const jsonCall = mockRes.json.mock.calls[0][0];
      expect(jsonCall.message).toBe('Invalid input');
    });

    it('should handle authentication errors (401)', () => {
      const error = new Error('Unauthorized');
      error.status = 401;
      error.publicMessage = 'Invalid credentials';
      
      errorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should handle authorization errors (403)', () => {
      const error = new Error('Forbidden');
      error.status = 403;
      error.publicMessage = 'Access denied';
      
      errorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should handle not found errors (404)', () => {
      const error = new Error('Not found');
      error.status = 404;
      error.publicMessage = 'Resource not found';
      
      errorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });
});
