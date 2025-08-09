// VVG World Pain Points Database Interface
import { executeQuery } from './db';

export interface PainPoint {
  id: number;
  title: string;
  description: string;
  category: 'Safety' | 'Efficiency' | 'Cost Savings' | 'Quality' | 'Other';
  submitted_by: string;
  department?: string;
  location?: string;
  status: 'pending' | 'under_review' | 'in_progress' | 'completed' | 'rejected';
  upvotes: number;
  downvotes: number;
  attachment_url?: string;
  attachment_filename?: string;
  attachment_size?: number;
  created_at: string;
  updated_at: string;
}

export interface PainPointVote {
  id: number;
  pain_point_id: number;
  user_email: string;
  vote_type: 'up' | 'down';
  created_at: string;
}

export interface User {
  id: number;
  email: string;
  name?: string;
  department?: string;
  location?: string;
  created_at: string;
  last_login_at?: string;
}

export const painPointsDb = {
  // Pain Points CRUD
  async getAllPainPoints(): Promise<PainPoint[]> {
    return executeQuery<PainPoint[]>({
      query: 'SELECT * FROM pain_points ORDER BY created_at DESC'
    });
  },

  async getPainPointById(id: number): Promise<PainPoint | null> {
    const results = await executeQuery<PainPoint[]>({
      query: 'SELECT * FROM pain_points WHERE id = ?',
      values: [id]
    });
    return results[0] || null;
  },

  async createPainPoint(data: {
    title: string;
    description: string;
    category: PainPoint['category'];
    submitted_by: string;
    department?: string;
    location?: string;
    attachment_url?: string;
    attachment_filename?: string;
    attachment_size?: number;
  }): Promise<PainPoint> {
    const result = await executeQuery<any>({
      query: `
        INSERT INTO pain_points 
        (title, description, category, submitted_by, department, location, 
         attachment_url, attachment_filename, attachment_size)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      values: [
        data.title,
        data.description,
        data.category,
        data.submitted_by,
        data.department || null,
        data.location || null,
        data.attachment_url || null,
        data.attachment_filename || null,
        data.attachment_size || null
      ]
    });

    const painPoint = await this.getPainPointById(result.insertId);
    if (!painPoint) throw new Error('Failed to create pain point');
    return painPoint;
  },

  async updatePainPoint(id: number, data: Partial<PainPoint>): Promise<PainPoint> {
    const fields = Object.keys(data)
      .filter(key => key !== 'id' && key !== 'created_at')
      .map(key => `${key} = ?`)
      .join(', ');
    
    const values = Object.entries(data)
      .filter(([key]) => key !== 'id' && key !== 'created_at')
      .map(([_, value]) => value);
    
    await executeQuery({
      query: `UPDATE pain_points SET ${fields} WHERE id = ?`,
      values: [...values, id]
    });

    const painPoint = await this.getPainPointById(id);
    if (!painPoint) throw new Error('Pain point not found after update');
    return painPoint;
  },

  async deletePainPoint(id: number): Promise<void> {
    await executeQuery({
      query: 'DELETE FROM pain_points WHERE id = ?',
      values: [id]
    });
  },

  // Voting System
  async vote(painPointId: number, userEmail: string, voteType: 'up' | 'down'): Promise<PainPoint> {
    // Check if pain point exists
    const painPoint = await this.getPainPointById(painPointId);
    if (!painPoint) throw new Error('Pain point not found');

    // Check existing vote
    const existingVote = await executeQuery<PainPointVote[]>({
      query: 'SELECT * FROM pain_point_votes WHERE pain_point_id = ? AND user_email = ?',
      values: [painPointId, userEmail]
    });

    if (existingVote.length > 0) {
      // Update existing vote
      await executeQuery({
        query: 'UPDATE pain_point_votes SET vote_type = ? WHERE pain_point_id = ? AND user_email = ?',
        values: [voteType, painPointId, userEmail]
      });
    } else {
      // Insert new vote
      await executeQuery({
        query: 'INSERT INTO pain_point_votes (pain_point_id, user_email, vote_type) VALUES (?, ?, ?)',
        values: [painPointId, userEmail, voteType]
      });
    }

    // Update cached vote counts
    await this.updateVoteCounts(painPointId);
    
    const updatedPainPoint = await this.getPainPointById(painPointId);
    if (!updatedPainPoint) throw new Error('Failed to get updated pain point');
    return updatedPainPoint;
  },

  async getUserVote(painPointId: number, userEmail: string): Promise<PainPointVote | null> {
    const results = await executeQuery<PainPointVote[]>({
      query: 'SELECT * FROM pain_point_votes WHERE pain_point_id = ? AND user_email = ?',
      values: [painPointId, userEmail]
    });
    return results[0] || null;
  },

  async updateVoteCounts(painPointId: number): Promise<void> {
    const upvotes = await executeQuery<{count: number}[]>({
      query: 'SELECT COUNT(*) as count FROM pain_point_votes WHERE pain_point_id = ? AND vote_type = "up"',
      values: [painPointId]
    });

    const downvotes = await executeQuery<{count: number}[]>({
      query: 'SELECT COUNT(*) as count FROM pain_point_votes WHERE pain_point_id = ? AND vote_type = "down"',
      values: [painPointId]
    });

    await executeQuery({
      query: 'UPDATE pain_points SET upvotes = ?, downvotes = ? WHERE id = ?',
      values: [upvotes[0].count, downvotes[0].count, painPointId]
    });
  },

  // User Management
  async findUserByEmail(email: string): Promise<User | null> {
    const results = await executeQuery<User[]>({
      query: 'SELECT * FROM users WHERE email = ?',
      values: [email]
    });
    return results[0] || null;
  },

  async createOrUpdateUser(userData: {
    email: string;
    name?: string;
    department?: string;
    location?: string;
  }): Promise<User> {
    const existing = await this.findUserByEmail(userData.email);

    if (existing) {
      await executeQuery({
        query: 'UPDATE users SET name = ?, department = ?, location = ?, last_login_at = NOW() WHERE email = ?',
        values: [
          userData.name || existing.name, 
          userData.department || existing.department, 
          userData.location || existing.location, 
          userData.email
        ]
      });
    } else {
      await executeQuery({
        query: 'INSERT INTO users (email, name, department, location) VALUES (?, ?, ?, ?)',
        values: [userData.email, userData.name || null, userData.department || null, userData.location || null]
      });
    }

    const user = await this.findUserByEmail(userData.email);
    if (!user) throw new Error('Failed to create or update user');
    return user;
  },

  // Analytics
  async getStats(): Promise<{
    totalPainPoints: number;
    pendingReview: number;
    inProgress: number;
    completed: number;
    byCategory: Record<string, number>;
  }> {
    const total = await executeQuery<{count: number}[]>({
      query: 'SELECT COUNT(*) as count FROM pain_points'
    });

    const pending = await executeQuery<{count: number}[]>({
      query: 'SELECT COUNT(*) as count FROM pain_points WHERE status = "pending"'
    });

    const inProgress = await executeQuery<{count: number}[]>({
      query: 'SELECT COUNT(*) as count FROM pain_points WHERE status = "in_progress"'
    });

    const completed = await executeQuery<{count: number}[]>({
      query: 'SELECT COUNT(*) as count FROM pain_points WHERE status = "completed"'
    });

    const categories = await executeQuery<{category: string, count: number}[]>({
      query: 'SELECT category, COUNT(*) as count FROM pain_points GROUP BY category'
    });

    const byCategory = categories.reduce((acc, cat) => {
      acc[cat.category] = cat.count;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalPainPoints: total[0].count,
      pendingReview: pending[0].count,
      inProgress: inProgress[0].count,
      completed: completed[0].count,
      byCategory
    };
  }
};

export default painPointsDb;