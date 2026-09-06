import { getPool } from '../db';
import { PoolConnection } from 'mysql2/promise';
import { hashPassword } from '../password';
import { enforceRolePermissions, resolvePermissions } from '../permissions';
import { ModulePermissions, UserRole, AuditEventType, EmployeeStatus } from '../types';

const EMPLOYEE_COLUMNS: { js: string; sql: string; type?: 'number' }[] = [
  { js: 'employeeId', sql: 'employee_id' },
  { js: 'photo', sql: 'photo' },
  { js: 'qrCode', sql: 'qr_code' },
  { js: 'name', sql: 'name' },
  { js: 'mobile', sql: 'mobile' },
  { js: 'email', sql: 'email' },
  { js: 'designation', sql: 'designation' },
  { js: 'department', sql: 'department' },
  { js: 'salary', sql: 'salary', type: 'number' },
  { js: 'salaryType', sql: 'salary_type' },
  { js: 'employmentType', sql: 'employment_type' },
  { js: 'joiningDate', sql: 'joining_date' },
  { js: 'status', sql: 'status' },
  { js: 'role', sql: 'role' },
  { js: 'createdAt', sql: 'created_at' },
  { js: 'emergencyContactName', sql: 'emergency_contact_name' },
  { js: 'emergencyContactMobile', sql: 'emergency_contact_mobile' },
  { js: 'dateOfBirth', sql: 'date_of_birth' },
  { js: 'gender', sql: 'gender' },
  { js: 'aadharNumber', sql: 'aadhar_number' },
  { js: 'panNumber', sql: 'pan_number' },
  { js: 'otherIdType', sql: 'other_id_type' },
  { js: 'otherIdNumber', sql: 'other_id_number' },
  { js: 'addressProofType', sql: 'address_proof_type' },
  { js: 'addressProofNumber', sql: 'address_proof_number' },
  { js: 'currentAddress', sql: 'current_address' },
  { js: 'permanentAddress', sql: 'permanent_address' },
  { js: 'city', sql: 'city' },
  { js: 'state', sql: 'state' },
  { js: 'pincode', sql: 'pincode' },
  { js: 'aadharFront', sql: 'aadhar_front' },
  { js: 'aadharBack', sql: 'aadhar_back' },
  { js: 'panCard', sql: 'pan_card' },
  { js: 'addressProof', sql: 'address_proof' },
  { js: 'bankName', sql: 'bank_name' },
  { js: 'accountHolderName', sql: 'account_holder_name' },
  { js: 'accountNumber', sql: 'account_number' },
  { js: 'ifsc', sql: 'ifsc' },
  { js: 'branch', sql: 'branch' },
];

function employeeRowToObject(row: any) {
  const obj: any = { id: row.id };
  for (const col of EMPLOYEE_COLUMNS) obj[col.js] = row[col.sql];
  return obj;
}

function employeeValues(emp: any) {
  return EMPLOYEE_COLUMNS.map((c) => {
    let v = emp[c.js];
    if (v === undefined) v = null;
    return v;
  });
}

// Accepts either a Pool or a PoolConnection — both expose the same
// .execute(sql, params) signature in mysql2/promise.
type Executor = { execute: (sql: string, params?: any[]) => Promise<any> };

async function writeAudit(
  conn: Executor,
  userEmail: string,
  employeeId: string,
  eventType: AuditEventType,
  performedBy: string,
  details?: string,
  recordId?: string,
  ipAddress?: string | null,
  deviceInfo?: string | null
) {
  const id = `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await conn.execute(
    `INSERT INTO employee_audit_logs (id, user_email, employee_id, event_type, performed_by, timestamp, record_id, ip_address, device_info, details)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, userEmail, employeeId, eventType, performedBy, new Date().toISOString(), recordId ?? null, ipAddress ?? null, deviceInfo ?? null, details ?? null]
  );
}

// ---- List / read (never selects password_hash) ----

export async function listEmployees(userEmail: string) {
  const pool = getPool();
  const [rows] = await pool.execute<any[]>('SELECT * FROM employees WHERE user_email = ?', [userEmail]);
  const [credRows] = await pool.execute<any[]>(
    'SELECT employee_id, username, login_enabled, last_login_at FROM employee_credentials WHERE user_email = ?',
    [userEmail]
  );
  const [docCountRows] = await pool.execute<any[]>(
    `SELECT d.employee_id, COUNT(*) as cnt,
       SUM(CASE WHEN d.verification_status = 'Verified' THEN 1 ELSE 0 END) as verifiedCnt
     FROM employee_documents d
     INNER JOIN employees e ON d.employee_id = e.id
     WHERE e.user_email = ? GROUP BY d.employee_id`,
    [userEmail]
  );
  const credByEmployee = new Map((credRows as any[]).map((r) => [r.employee_id, r]));
  const docsByEmployee = new Map((docCountRows as any[]).map((r) => [r.employee_id, r]));

  return (rows as any[]).map((row) => {
    const obj = employeeRowToObject(row);
    const cred = credByEmployee.get(row.id);
    const docs = docsByEmployee.get(row.id);
    obj.loginAccess = cred
      ? { username: cred.username, loginEnabled: !!cred.login_enabled, lastLoginAt: cred.last_login_at, forcePasswordChange: false }
      : undefined;
    obj.kycStatus = !docs ? 'Not Submitted' : (Number(docs.verifiedCnt) === Number(docs.cnt) ? 'Verified' : 'Pending');
    return obj;
  });
}

export async function getEmployeeDetail(userEmail: string, id: string) {
  const pool = getPool();
  const [rows] = await pool.execute<any[]>('SELECT * FROM employees WHERE id = ? AND user_email = ?', [id, userEmail]);
  const row = (rows as any[])[0];
  if (!row) return null;
  const obj = employeeRowToObject(row);

  const [credRows] = await pool.execute<any[]>(
    'SELECT username, login_email, login_enabled, force_password_change, last_login_at, last_login_device, last_login_ip, created_at FROM employee_credentials WHERE employee_id = ?',
    [id]
  );
  const cred = (credRows as any[])[0];
  obj.loginAccess = cred
    ? {
        username: cred.username, loginEmail: cred.login_email, loginEnabled: !!cred.login_enabled,
        forcePasswordChange: !!cred.force_password_change, lastLoginAt: cred.last_login_at,
        lastLoginDevice: cred.last_login_device, lastLoginIp: cred.last_login_ip, createdAt: cred.created_at,
      }
    : { loginEnabled: false, forcePasswordChange: false };

  const [permRows] = await pool.execute<any[]>('SELECT permissions FROM employee_permissions WHERE employee_id = ?', [id]);
  const savedPermissions: ModulePermissions | null = (permRows as any[])[0]?.permissions ?? null;
  obj.modulePermissions = resolvePermissions(obj.role as UserRole, savedPermissions);

  const [docRows] = await pool.execute<any[]>(
    'SELECT id, document_type, file_data, uploaded_at, uploaded_by, verification_status, verified_by, verified_at, notes, rejection_reason FROM employee_documents WHERE employee_id = ? ORDER BY uploaded_at DESC',
    [id]
  );
  obj.documents = (docRows as any[]).map((d) => ({
    id: d.id, documentType: d.document_type, fileData: d.file_data, uploadedAt: d.uploaded_at,
    uploadedBy: d.uploaded_by, verificationStatus: d.verification_status, verifiedBy: d.verified_by,
    verifiedAt: d.verified_at, notes: d.notes, rejectionReason: d.rejection_reason,
  }));

  return obj;
}

// Server-side context used by requirePermission() — deliberately excludes
// anything sensitive, just enough to authorize a request.
export async function getEmployeeAccessContext(userEmail: string, employeeId: string): Promise<{ status: EmployeeStatus; role: UserRole; permissions: ModulePermissions } | null> {
  const pool = getPool();
  const [rows] = await pool.execute<any[]>('SELECT role, status FROM employees WHERE id = ? AND user_email = ?', [employeeId, userEmail]);
  const row = (rows as any[])[0];
  if (!row) return null;
  const [permRows] = await pool.execute<any[]>('SELECT permissions FROM employee_permissions WHERE employee_id = ?', [employeeId]);
  const saved: ModulePermissions | null = (permRows as any[])[0]?.permissions ?? null;
  return { status: row.status as EmployeeStatus, role: row.role as UserRole, permissions: resolvePermissions(row.role as UserRole, saved) };
}

// ---- Create / update (employee row + permissions; credentials handled separately) ----

export async function createEmployee(userEmail: string, emp: any, performedBy: string) {
  if (!emp?.id) throw new Error('id is required');
  const pool = getPool();
  const conn: PoolConnection = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const cols = ['id', 'user_email', ...EMPLOYEE_COLUMNS.map((c) => c.sql)];
    await conn.execute(`INSERT INTO employees (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`, [emp.id, userEmail, ...employeeValues(emp)]);

    const role = (emp.role as UserRole) || 'Employee';
    const permissions = enforceRolePermissions(role, emp.modulePermissions);
    await conn.execute(
      `INSERT INTO employee_permissions (employee_id, user_email, permissions, updated_at, updated_by) VALUES (?, ?, ?, ?, ?)`,
      [emp.id, userEmail, JSON.stringify(permissions), new Date().toISOString(), performedBy]
    );

    await writeAudit(conn, userEmail, emp.id, 'employee_created', performedBy, `${emp.name || 'Associate'} (${role}) created`);
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function updateEmployee(userEmail: string, id: string, emp: any, performedBy: string) {
  const pool = getPool();
  const conn: PoolConnection = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const setClause = EMPLOYEE_COLUMNS.map((c) => `${c.sql} = ?`).join(', ');
    const [result]: any = await conn.execute(
      `UPDATE employees SET ${setClause} WHERE id = ? AND user_email = ?`,
      [...employeeValues(emp), id, userEmail]
    );
    if (result.affectedRows > 0) {
      await writeAudit(conn, userEmail, id, 'employee_edited', performedBy, `${emp.name || 'Associate'} updated`);
    }
    await conn.commit();
    return result.affectedRows > 0;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// Dedicated status-change path (Enable/Disable, Suspend, Terminate quick
// actions on the list page) — separate from the generic updateEmployee() so
// the audit trail records a specific, human-readable event type instead of a
// generic "employee_edited" for what is otherwise the most security-relevant
// change an Admin makes to an employee record.
export async function changeEmployeeStatus(userEmail: string, employeeId: string, status: EmployeeStatus, performedBy: string) {
  const pool = getPool();
  const conn: PoolConnection = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result]: any = await conn.execute(
      'UPDATE employees SET status = ? WHERE id = ? AND user_email = ?',
      [status, employeeId, userEmail]
    );
    if (result.affectedRows > 0) {
      const eventType: AuditEventType =
        status === 'Suspended' ? 'employee_suspended' :
        status === 'Active' ? 'employee_activated' :
        status === 'Inactive' ? 'employee_disabled' :
        status === 'Terminated' ? 'employee_terminated' : 'employee_edited';
      await writeAudit(conn, userEmail, employeeId, eventType, performedBy, `Status changed to ${status}`);
    }
    await conn.commit();
    return result.affectedRows > 0;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function deleteEmployee(userEmail: string, id: string) {
  const pool = getPool();
  const [result]: any = await pool.execute('DELETE FROM employees WHERE id = ? AND user_email = ?', [id, userEmail]);
  return result.affectedRows > 0;
}

// ---- Permissions ----

export async function updateEmployeePermissions(userEmail: string, employeeId: string, permissions: ModulePermissions, performedBy: string) {
  const pool = getPool();
  const conn: PoolConnection = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [roleRows] = await conn.execute<any[]>('SELECT role FROM employees WHERE id = ? AND user_email = ?', [employeeId, userEmail]);
    const role = (roleRows as any[])[0]?.role as UserRole;
    if (!role) {
      await conn.rollback();
      return false;
    }
    const safePermissions = enforceRolePermissions(role, permissions);
    await conn.execute(
      `INSERT INTO employee_permissions (employee_id, user_email, permissions, updated_at, updated_by) VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE permissions = VALUES(permissions), updated_at = VALUES(updated_at), updated_by = VALUES(updated_by)`,
      [employeeId, userEmail, JSON.stringify(safePermissions), new Date().toISOString(), performedBy]
    );
    await writeAudit(conn, userEmail, employeeId, 'permission_changed', performedBy, 'Module access permissions updated');
    await conn.commit();
    return true;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// ---- Login access / credentials (password_hash never returned to caller) ----

export async function setEmployeeLoginAccess(
  userEmail: string,
  employeeId: string,
  data: { username?: string; loginEmail?: string; password?: string; loginEnabled?: boolean; forcePasswordChange?: boolean },
  performedBy: string
) {
  const pool = getPool();
  const conn: PoolConnection = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [existingRows] = await conn.execute<any[]>('SELECT employee_id FROM employee_credentials WHERE employee_id = ?', [employeeId]);
    const exists = (existingRows as any[]).length > 0;
    const now = new Date().toISOString();

    if (!exists) {
      if (!data.username || !data.password) {
        await conn.rollback();
        throw new Error('username and password are required to create login access');
      }
      const hash = await hashPassword(data.password);
      await conn.execute(
        `INSERT INTO employee_credentials (employee_id, user_email, username, login_email, password_hash, login_enabled, force_password_change, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [employeeId, userEmail, data.username, data.loginEmail ?? null, hash, data.loginEnabled ?? true, data.forcePasswordChange ?? false, now, now]
      );
    } else {
      const sets: string[] = [];
      const values: any[] = [];
      if (data.username !== undefined) { sets.push('username = ?'); values.push(data.username); }
      if (data.loginEmail !== undefined) { sets.push('login_email = ?'); values.push(data.loginEmail); }
      if (data.loginEnabled !== undefined) { sets.push('login_enabled = ?'); values.push(data.loginEnabled); }
      if (data.forcePasswordChange !== undefined) { sets.push('force_password_change = ?'); values.push(data.forcePasswordChange); }
      if (data.password) { sets.push('password_hash = ?'); values.push(await hashPassword(data.password)); }
      sets.push('updated_at = ?'); values.push(now);
      if (sets.length > 1) {
        await conn.execute(`UPDATE employee_credentials SET ${sets.join(', ')} WHERE employee_id = ?`, [...values, employeeId]);
      }
    }

    if (data.loginEnabled === false) {
      await writeAudit(conn, userEmail, employeeId, 'account_blocked', performedBy, 'Login access disabled');
    } else if (data.loginEnabled === true) {
      await writeAudit(conn, userEmail, employeeId, 'account_unblocked', performedBy, 'Login access enabled');
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function resetEmployeePassword(userEmail: string, employeeId: string, newPassword: string, performedBy: string) {
  const pool = getPool();
  const conn: PoolConnection = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const hash = await hashPassword(newPassword);
    const [result]: any = await conn.execute(
      `UPDATE employee_credentials SET password_hash = ?, force_password_change = TRUE, updated_at = ? WHERE employee_id = ? AND user_email = ?`,
      [hash, new Date().toISOString(), employeeId, userEmail]
    );
    if (result.affectedRows > 0) {
      await writeAudit(conn, userEmail, employeeId, 'password_reset', performedBy, 'Password reset by administrator');
    }
    await conn.commit();
    return result.affectedRows > 0;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function revokeAllSessionsForEmployee(employeeId: string) {
  const { deleteAllSessionsForEmployee } = await import('../session');
  await deleteAllSessionsForEmployee(employeeId);
}

// ---- Documents (KYC vault) ----

export async function listEmployeeDocuments(userEmail: string, employeeId: string) {
  const pool = getPool();
  const [rows] = await pool.execute<any[]>(
    'SELECT id, document_type, file_data, uploaded_at, uploaded_by, verification_status, verified_by, verified_at, notes, rejection_reason FROM employee_documents WHERE employee_id = ? AND user_email = ? ORDER BY uploaded_at DESC',
    [employeeId, userEmail]
  );
  return (rows as any[]).map((d) => ({
    id: d.id, documentType: d.document_type, fileData: d.file_data, uploadedAt: d.uploaded_at,
    uploadedBy: d.uploaded_by, verificationStatus: d.verification_status, verifiedBy: d.verified_by,
    verifiedAt: d.verified_at, notes: d.notes, rejectionReason: d.rejection_reason,
  }));
}

export async function uploadEmployeeDocument(userEmail: string, employeeId: string, documentType: string, fileData: string, uploadedBy: string) {
  const pool = getPool();
  const conn: PoolConnection = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const id = `DOC-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();
    await conn.execute(
      `INSERT INTO employee_documents (id, employee_id, user_email, document_type, file_data, uploaded_at, uploaded_by, verification_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending')`,
      [id, employeeId, userEmail, documentType, fileData, now, uploadedBy]
    );
    await writeAudit(conn, userEmail, employeeId, 'kyc_uploaded', uploadedBy, `${documentType} uploaded`, id);
    await conn.commit();
    return id;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function setDocumentVerification(userEmail: string, employeeId: string, docId: string, status: 'Verified' | 'Rejected', verifiedBy: string, notes?: string, rejectionReason?: string) {
  const pool = getPool();
  const conn: PoolConnection = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // Verifying a previously-rejected document clears the old reason so it
    // never lingers on a now-approved document.
    const reasonToStore = status === 'Rejected' ? (rejectionReason ?? null) : null;
    const [result]: any = await conn.execute(
      `UPDATE employee_documents SET verification_status = ?, verified_by = ?, verified_at = ?, notes = ?, rejection_reason = ? WHERE id = ? AND employee_id = ? AND user_email = ?`,
      [status, verifiedBy, new Date().toISOString(), notes ?? null, reasonToStore, docId, employeeId, userEmail]
    );
    if (result.affectedRows > 0) {
      const details = status === 'Rejected' ? (rejectionReason || notes) : notes;
      await writeAudit(conn, userEmail, employeeId, status === 'Verified' ? 'kyc_verified' : 'kyc_rejected', verifiedBy, details, docId);
    }
    await conn.commit();
    return result.affectedRows > 0;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function deleteEmployeeDocument(userEmail: string, employeeId: string, docId: string, performedBy: string) {
  const pool = getPool();
  const conn: PoolConnection = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result]: any = await conn.execute('DELETE FROM employee_documents WHERE id = ? AND employee_id = ? AND user_email = ?', [docId, employeeId, userEmail]);
    if (result.affectedRows > 0) {
      await writeAudit(conn, userEmail, employeeId, 'kyc_deleted', performedBy, undefined, docId);
    }
    await conn.commit();
    return result.affectedRows > 0;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// ---- Audit log ----

export async function listEmployeeAuditLog(userEmail: string, employeeId: string) {
  const pool = getPool();
  const [rows] = await pool.execute<any[]>(
    'SELECT id, event_type, performed_by, timestamp, record_id, ip_address, device_info, details FROM employee_audit_logs WHERE employee_id = ? AND user_email = ? ORDER BY timestamp DESC LIMIT 200',
    [employeeId, userEmail]
  );
  return (rows as any[]).map((r) => ({
    id: r.id, eventType: r.event_type, employeeId, performedBy: r.performed_by, timestamp: r.timestamp,
    recordId: r.record_id, ipAddress: r.ip_address, deviceInfo: r.device_info, details: r.details,
  }));
}

export async function logLoginAudit(userEmail: string, employeeId: string, performedBy: string, eventType: 'login' | 'logout', ipAddress?: string | null, deviceInfo?: string | null) {
  const pool = getPool();
  await writeAudit(pool, userEmail, employeeId, eventType, performedBy, undefined, undefined, ipAddress, deviceInfo);
}
