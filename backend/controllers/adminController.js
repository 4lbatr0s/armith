import { createError } from '../error-codes.js';
import { readDatabase } from '../utils/database.js';

// Admin endpoint to list all verifications
export const getVerifications = async (req, res) => {
  try {
    const database = await readDatabase();
    const { page = 1, limit = 10, status } = req.query;
    
    let users = database.users;
    
    // Filter by status if provided
    if (status) {
      users = users.filter(user => user.status === status);
    }
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedUsers = users.slice(startIndex, endIndex);
    
    res.json({
      users: paginatedUsers.map(user => ({
        id: user.id,
        country: user.country,
        status: user.status,
        createdAt: user.createdAt,
        hasIdResult: !!user.idResult,
        hasSelfieResult: !!user.selfieResult
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(users.length / limit),
        totalUsers: users.length,
        hasNext: endIndex < users.length,
        hasPrev: startIndex > 0
      }
    });
  } catch (error) {
    console.error('Admin verifications error:', error);
    res.status(500).json({
      status: 'failed',
      errors: [createError('INTERNAL_SERVER_ERROR')]
    });
  }
}; 