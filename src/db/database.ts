/**
 * database.ts
 * Centralized Dexie.js database definition for Personal Expense Tracker.
 *
 * Schema versioning:
 *   Increment the version number and add a migration in migrations.ts
 *   whenever the schema changes. Never modify an existing version's schema.
 *
 * Indexes:
 *   Only index fields that are used in .where() queries to keep the
 *   IndexedDB store lean.
 */
import Dexie, { type Table } from 'dexie'
import type {
  MonthlyPlan,
  BudgetCategory,
  MonthlyAllocation,
  Transaction,
} from '@/types/models'

export class ExpenseTrackerDatabase extends Dexie {
  monthlyPlans!: Table<MonthlyPlan, string>
  categories!: Table<BudgetCategory, string>
  allocations!: Table<MonthlyAllocation, string>
  transactions!: Table<Transaction, string>

  constructor() {
    super('PersonalExpenseTrackerDB')

    this.version(1).stores({
      /**
       * monthlyPlans
       *   id          — primary key (UUID)
       *   month       — indexed for quick lookup of the current month's plan
       */
      monthlyPlans: 'id, month',

      /**
       * categories
       *   id          — primary key (UUID)
       *   sortOrder   — indexed for ordered display
       */
      categories: 'id, sortOrder',

      /**
       * allocations
       *   id              — primary key (UUID)
       *   monthlyPlanId   — indexed for fetching allocations by plan
       *   categoryId      — indexed for fetching allocations by category
       */
      allocations: 'id, monthlyPlanId, categoryId',

      /**
       * transactions
       *   id              — primary key (UUID)
       *   monthlyPlanId   — indexed for fetching transactions by plan/month
       *   categoryId      — indexed for category-based filtering
       *   date            — indexed for date-range queries
       */
      transactions: 'id, monthlyPlanId, categoryId, date',
    })
  }
}

/**
 * Singleton database instance.
 * Import `db` wherever IndexedDB access is needed (repositories only).
 *
 * Do NOT import `db` directly in React components or hooks.
 * Always go through the repository layer.
 */
export const db = new ExpenseTrackerDatabase()

