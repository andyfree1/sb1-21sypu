import Dexie, { Table } from 'dexie';
import type { Sale, CommissionLevel } from '../types/sales';

const DEFAULT_COMMISSION_LEVELS: CommissionLevel[] = [
  { level: 1, minAmount: 162500, maxAmount: 243749, additionalCommission: 1 },
  { level: 2, minAmount: 243750, maxAmount: 324999, additionalCommission: 2 },
  { level: 3, minAmount: 325000, maxAmount: 406249, additionalCommission: 3 },
  { level: 4, minAmount: 406250, maxAmount: 487499, additionalCommission: 3.5 },
  { level: 5, minAmount: 487500, maxAmount: 584999, additionalCommission: 4 },
  { level: 6, minAmount: 585000, maxAmount: 682499, additionalCommission: 5 },
  { level: 7, minAmount: 682500, maxAmount: 893749, additionalCommission: 5.5 },
  { level: 8, minAmount: 893750, maxAmount: 999999999, additionalCommission: 6 }
];

export interface Project {
  id?: number;
  name: string;
  createdAt: string;
  updatedAt: string;
  commissionLevels: CommissionLevel[];
}

class HiltonDatabase extends Dexie {
  sales!: Table<Sale>;
  projects!: Table<Project>;

  constructor() {
    super('HiltonSalesDB');
    
    this.version(1).stores({
      sales: '++id, projectId, date, clientLastName, saleType, isCancelled',
      projects: '++id, name, createdAt'
    });

    // Add hooks for automatic timestamps
    this.projects.hook('creating', (primKey, obj) => {
      const project = {
        ...obj,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        commissionLevels: [...DEFAULT_COMMISSION_LEVELS]
      };
      return project;
    });

    this.projects.hook('updating', (mods) => {
      if (typeof mods === 'object') {
        return {
          ...mods,
          updatedAt: new Date().toISOString()
        };
      }
      return mods;
    });
  }

  async initialize() {
    try {
      const projectCount = await this.projects.count();
      if (projectCount === 0) {
        await this.createInitialProject();
      }
    } catch (error) {
      console.error('Failed to initialize database:', error);
      await this.recoverDatabase();
    }
  }

  private async createInitialProject(): Promise<number> {
    const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    const project: Project = {
      name: currentMonth,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      commissionLevels: [...DEFAULT_COMMISSION_LEVELS]
    };
    return await this.projects.add(project);
  }

  private async recoverDatabase() {
    try {
      await this.delete();
      await this.open();
      await this.createInitialProject();
    } catch (error) {
      console.error('Failed to recover database:', error);
      throw error;
    }
  }

  async getCurrentProject(): Promise<Project | undefined> {
    try {
      const projects = await this.projects.toArray();
      if (projects.length === 0) {
        const id = await this.createInitialProject();
        return await this.projects.get(id);
      }
      return projects[0];
    } catch (error) {
      console.error('Failed to get current project:', error);
      throw error;
    }
  }

  async clearAllData(): Promise<boolean> {
    try {
      await this.transaction('rw', this.sales, this.projects, async () => {
        // Delete all sales first
        await this.sales.clear();
        
        // Get current project ID before clearing
        const currentProject = await this.getCurrentProject();
        const currentProjectId = currentProject?.id;
        
        // Clear all projects
        await this.projects.clear();
        
        // Create new project with same ID if possible
        const newProject: Project = {
          id: currentProjectId, // Maintain same ID to prevent reference issues
          name: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          commissionLevels: [...DEFAULT_COMMISSION_LEVELS]
        };
        
        // Add the new project
        if (currentProjectId) {
          await this.projects.put(newProject);
        } else {
          await this.projects.add(newProject);
        }

        // Clear localStorage data except commission levels
        Object.keys(localStorage).forEach(key => {
          if (!key.includes('commission')) {
            localStorage.removeItem(key);
          }
        });

        // Reset IndexedDB
        await this.sales.clear();
      });
      
      return true;
    } catch (error) {
      console.error('Failed to clear database:', error);
      throw error;
    }
  }

  async createNewProject(name: string): Promise<number> {
    try {
      const project: Project = {
        name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        commissionLevels: [...DEFAULT_COMMISSION_LEVELS]
      };
      return await this.projects.add(project);
    } catch (error) {
      console.error('Failed to create new project:', error);
      throw error;
    }
  }

  async updateCommissionLevels(projectId: number, levels: CommissionLevel[]): Promise<boolean> {
    try {
      const project = await this.projects.get(projectId);
      if (!project) throw new Error('Project not found');

      await this.projects.update(projectId, {
        ...project,
        commissionLevels: levels,
        updatedAt: new Date().toISOString()
      });
      return true;
    } catch (error) {
      console.error('Failed to update commission levels:', error);
      throw error;
    }
  }
}

export const db = new HiltonDatabase();

// Initialize database when module is loaded
db.initialize().catch(error => {
  console.error('Failed to initialize database:', error);
});

export const updateCommissionLevels = async (projectId: number, levels: CommissionLevel[]) => {
  return await db.updateCommissionLevels(projectId, levels);
};

export { DEFAULT_COMMISSION_LEVELS };