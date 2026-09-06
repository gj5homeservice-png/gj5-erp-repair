// Column configs for simple, single-table ERP entities (no nested children,
// no multi-table side effects) — these are served by the generic CRUD routes.
// Entities with nested child records or transactional side effects (invoices,
// repair_calls, stock_items, repair_jobs, sales_orders, wallet, expenses) have
// their own bespoke route files instead — see src/app/api/erp/**.

export type ColType = 'string' | 'number' | 'boolean' | 'json';
export interface ColumnDef { js: string; sql: string; type?: ColType }
export interface EntityConfig { table: string; columns: ColumnDef[] }

export const ENTITIES: Record<string, EntityConfig> = {
  customers: {
    table: 'customers',
    columns: [
      { js: 'name', sql: 'name' },
      { js: 'mobile', sql: 'mobile' },
      { js: 'address', sql: 'address' },
      { js: 'pincode', sql: 'pincode' },
      { js: 'email', sql: 'email' },
      { js: 'source', sql: 'source' },
      { js: 'createdAt', sql: 'created_at' },
    ],
  },
  // 'employees' used to be here as a generic entity, but it now has real
  // children (credentials, permissions, documents, audit log) and its own
  // bespoke routes (src/app/api/erp/employees/**, src/lib/erp/employees.ts),
  // matching the same pattern already used for stock/repair-calls/repair-jobs/
  // invoices/sales. A literal route always wins over this dynamic [entity]
  // catch-all for the same path, so removing the entry here is what actually
  // routes /api/erp/employees to the bespoke handler instead of this generic one.
  attendance: {
    table: 'attendance_records',
    columns: [
      { js: 'employeeId', sql: 'employee_id' },
      { js: 'employeeName', sql: 'employee_name' },
      { js: 'mobile', sql: 'mobile' },
      { js: 'date', sql: 'date' },
      { js: 'checkIn', sql: 'check_in' },
      { js: 'checkOut', sql: 'check_out' },
      { js: 'workHours', sql: 'work_hours' },
      { js: 'overtime', sql: 'overtime' },
      { js: 'latitude', sql: 'latitude' },
      { js: 'longitude', sql: 'longitude' },
      { js: 'address', sql: 'address' },
      { js: 'selfieCheckIn', sql: 'selfie_check_in' },
      { js: 'selfieCheckOut', sql: 'selfie_check_out' },
      { js: 'status', sql: 'status' },
      { js: 'createdAt', sql: 'created_at' },
      { js: 'deviceInfo', sql: 'device_info' },
      { js: 'browserInfo', sql: 'browser_info' },
      { js: 'ipAddress', sql: 'ip_address' },
      { js: 'attendanceType', sql: 'attendance_type' },
    ],
  },
  salaries: {
    table: 'salary_records',
    columns: [
      { js: 'employeeId', sql: 'employee_id' },
      { js: 'employeeName', sql: 'employee_name' },
      { js: 'month', sql: 'month' },
      { js: 'year', sql: 'year' },
      { js: 'baseSalary', sql: 'base_salary', type: 'number' },
      { js: 'attendanceDays', sql: 'attendance_days', type: 'number' },
      { js: 'overtimeHours', sql: 'overtime_hours', type: 'number' },
      { js: 'bonus', sql: 'bonus', type: 'number' },
      { js: 'deductions', sql: 'deductions', type: 'number' },
      { js: 'netPayable', sql: 'net_payable', type: 'number' },
      { js: 'paymentStatus', sql: 'payment_status' },
      { js: 'processedDate', sql: 'processed_date' },
    ],
  },
  leaves: {
    table: 'leave_requests',
    columns: [
      { js: 'employeeId', sql: 'employee_id' },
      { js: 'employeeName', sql: 'employee_name' },
      { js: 'startDate', sql: 'start_date' },
      { js: 'endDate', sql: 'end_date' },
      { js: 'type', sql: 'type' },
      { js: 'reason', sql: 'reason' },
      { js: 'status', sql: 'status' },
      { js: 'createdAt', sql: 'created_at' },
    ],
  },
  inquiries: {
    table: 'inquiries',
    columns: [
      { js: 'customerName', sql: 'customer_name' },
      { js: 'mobile', sql: 'mobile' },
      { js: 'alternateMobile', sql: 'alternate_mobile' },
      { js: 'address', sql: 'address' },
      { js: 'city', sql: 'city' },
      { js: 'pincode', sql: 'pincode' },
      { js: 'productType', sql: 'product_type' },
      { js: 'brand', sql: 'brand' },
      { js: 'modelNumber', sql: 'model_number' },
      { js: 'problemDescription', sql: 'problem_description' },
      { js: 'source', sql: 'source' },
      { js: 'priority', sql: 'priority' },
      { js: 'expectedBudget', sql: 'expected_budget', type: 'number' },
      { js: 'assignedTechnician', sql: 'assigned_technician' },
      { js: 'followUpDate', sql: 'follow_up_date' },
      { js: 'status', sql: 'status' },
      { js: 'notes', sql: 'notes' },
      { js: 'createdAt', sql: 'created_at' },
      { js: 'updatedAt', sql: 'updated_at' },
      { js: 'convertedJobId', sql: 'converted_job_id' },
      { js: 'conversionDate', sql: 'conversion_date' },
    ],
  },
  'transportation-logs': {
    table: 'transportation_logs',
    columns: [
      { js: 'runnerName', sql: 'runner_name' },
      { js: 'runnerMobile', sql: 'runner_mobile' },
      { js: 'jobId', sql: 'job_id' },
      { js: 'customerName', sql: 'customer_name' },
      { js: 'customerMobile', sql: 'customer_mobile' },
      { js: 'address', sql: 'address' },
      { js: 'status', sql: 'status' },
      { js: 'dispatchTime', sql: 'dispatch_time' },
    ],
  },
};

// Single-row-per-tenant tables (system_settings, visibility_settings, nav_order,
// backup_meta, wallet_balance) use their own upsert helpers — see singleRow.ts.
