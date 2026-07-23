// Run with: mongosh <MONGODB_URI> seed.mongosh.js
// Seeds users and bulkUploadBatches directly (bypasses the API and RabbitMQ —
// fine for local seed data). Every field in src/users/schemas/user.schema.ts
// and src/bulk-upload/schemas/bulk-upload-batch.schema.ts is populated by at
// least one document below.
//
// All nic / studentDetails.registrationNo / primaryEmail / username / userId
// values are unique per Mongo's indexes — re-running against a non-empty
// collection will hit duplicate-key errors. Drop the collections first if you
// need a clean re-seed:
//   db.users.deleteMany({}); db.bulkUploadBatches.deleteMany({});

const adminId = ObjectId('f6a3266ead53c628db1b1260'); // matches adminIdFromSub('admin-1')
const successBatchId = ObjectId();
const rejectedBatchId = ObjectId();

// --- bulkUploadBatches -----------------------------------------------------

db.bulkUploadBatches.insertMany([
  // a batch that parsed and created rows cleanly
  {
    _id: successBatchId,
    fileName: 'students-2025-batch1.xlsx',
    uploadedBy: adminId,
    role: 'student',
    batchMetadata: {
      degree: 'BSc Eng',
      faculty: 'Engineering',
      department: 'CSE',
      specialization: 'Software Engineering',
      level: 'L1',
      academicYear: '2025/2026',
      administrativeBatch: '2025',
      registrationDate: ISODate('2025-09-01'),
    },
    totalRows: 2,
    createdCount: 1, // 1 succeeded (activeStudentUserId below), 1 failed post-creation (failedStudentUserId)
    failedRowCount: 1,
    rowErrors: ['Row 5: broker unreachable — Auth Service could not be notified'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  // a batch rejected up front — parse errors, so NO user documents were created for it at all
  {
    _id: rejectedBatchId,
    fileName: 'students-2025-batch2-bad.csv',
    uploadedBy: adminId,
    role: 'student',
    batchMetadata: {
      degree: 'BSc Eng',
      department: 'CSE',
      level: 'L1',
      academicYear: '2025/2026',
      administrativeBatch: '2025',
    },
    totalRows: 2,
    createdCount: 0,
    failedRowCount: 2,
    rowErrors: [
      'Row 4: missing required value for "NIC"',
      'Row 5: Registration No "20A" must be 6 digits + 1 letter',
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]);

// --- users -------------------------------------------------------------

db.users.insertMany([
  // student, pending, single-entry registration form (firstName/lastName +
  // primaryEmail collected — unlike the bulk template) — covers title,
  // secondaryEmail, currentAddress, homeTelephoneNo, telephone.
  {
    userId: 'seed-0001-pending-student',
    role: 'student',
    authStatus: 'pending',
    firstName: 'Kasun',
    lastName: 'Silva',
    nameWithInitials: 'K.D. Silva',
    fullName: 'Kasun Dinesh Silva',
    title: 'Mr',
    dateOfBirth: ISODate('2004-02-11'),
    nic: '200016200145',
    primaryEmail: 'kasun.silva.seed@example.com',
    secondaryEmail: 'kasun.d.silva@gmail.com',
    gender: 'Male',
    currentAddress: '12 Lake Drive, Colombo 05',
    homeTelephoneNo: '0112345678',
    mobileNo: '0771234561',
    permanentAddress: '12 Lake Drive, Colombo 05',
    telephone: '0112345678',
    studentDetails: {
      registrationNo: '200401A',
      degree: 'BSc Eng',
      level: 'L1',
      department: 'CSE',
      academicYear: '2025/2026',
      administrativeBatch: '2025',
    },
    createdBy: adminId,
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // student, active, bulk-upload style — no firstName/lastName/email (bulk
  // template has neither), full studentDetails UGC fields. Covers
  // registrationDate, faculty, departmentGroup, specialization,
  // meritCategory, districtNo, religionNo, ethnicityNo, title (bulk template
  // *does* have Title), gender=Female.
  {
    userId: 'seed-0002-active-student',
    role: 'student',
    authStatus: 'active',
    username: 'student.200402b',
    nameWithInitials: 'S.K. Fernando',
    fullName: 'Saman Kumara Fernando',
    title: 'Mr',
    dateOfBirth: ISODate('2003-03-22'),
    nic: '200308702233',
    gender: 'Female',
    mobileNo: '0779876543',
    permanentAddress: '45 Kandy Road, Kurunegala',
    studentDetails: {
      registrationNo: '200402B',
      registrationDate: ISODate('2025-09-01'),
      degree: 'BSc Eng',
      faculty: 'Engineering',
      level: 'L1',
      department: 'CSE',
      departmentGroup: 'Group A',
      specialization: 'Software Engineering',
      academicYear: '2025/2026',
      administrativeBatch: '2025',
      alIndexNumber: '1234567',
      zScore: 1.8532,
      medium: 'English',
      meritCategory: 'District',
      districtNo: '11',
      religionNo: '01',
      ethnicityNo: '02',
    },
    batchId: successBatchId,
    createdBy: adminId,
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // student, failed — one row of an otherwise-successful bulk batch that
  // failed post-creation (e.g. the user.registration publish failed) — per
  // bulk-upload.service.ts's per-row try/catch, this doesn't abort the rest
  // of the batch.
  {
    userId: 'seed-0003-failed-student',
    role: 'student',
    authStatus: 'failed',
    failureReason: 'broker unreachable — Auth Service could not be notified',
    nameWithInitials: 'N.P. Perera',
    fullName: 'Nadeesha Piyumi Perera',
    dateOfBirth: ISODate('2003-06-10'),
    nic: '200220100456',
    mobileNo: '0712223344',
    permanentAddress: '9 Temple Road, Galle',
    studentDetails: {
      registrationNo: '200403C',
      degree: 'BSc Eng',
      level: 'L1',
      department: 'CSE',
      academicYear: '2025/2026',
      administrativeBatch: '2025',
    },
    batchId: successBatchId,
    createdBy: adminId,
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // student, pending, gender=Other, minimal doc — only the fields the schema
  // actually requires, nothing optional. Useful as a "smallest valid
  // document" reference and covers the third Gender enum value.
  {
    userId: 'seed-0004-pending-student-minimal',
    role: 'student',
    authStatus: 'pending',
    nameWithInitials: 'R.T. Jayasekara',
    dateOfBirth: ISODate('2004-05-30'),
    nic: '200455300789',
    gender: 'Other',
    studentDetails: {
      registrationNo: '200404D',
      degree: 'BSc Eng',
      level: 'L1',
      department: 'CSE',
      academicYear: '2025/2026',
      administrativeBatch: '2025',
    },
    createdBy: adminId,
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // staff, active — full staffDetails including officeExtension.
  {
    userId: 'seed-0005-active-staff',
    role: 'staff',
    authStatus: 'active',
    username: 'k.jayawardena',
    firstName: 'Kamal',
    lastName: 'Jayawardena',
    nameWithInitials: 'K. Jayawardena',
    dateOfBirth: ISODate('1985-11-02'),
    nic: '850560012345',
    primaryEmail: 'kamal.staff.seed@uom.lk',
    gender: 'Male',
    mobileNo: '0714445566',
    staffDetails: {
      departmentDivision: 'Computer Science and Engineering',
      officeExtension: '2145',
      designation: 'Lecturer',
      category: 'Academic',
    },
    createdBy: adminId,
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // staff, pending — not every staff member is active immediately; minimal
  // staffDetails (no officeExtension/category).
  {
    userId: 'seed-0006-pending-staff',
    role: 'staff',
    authStatus: 'pending',
    firstName: 'Nimal',
    lastName: 'Rathnayake',
    nameWithInitials: 'N. Rathnayake',
    dateOfBirth: ISODate('1990-03-06'),
    nic: '900660087654',
    primaryEmail: 'nimal.staff.seed@uom.lk',
    gender: 'Male',
    mobileNo: '0718889900',
    staffDetails: {
      departmentDivision: 'Electrical Engineering',
      designation: 'Instructor',
    },
    createdBy: adminId,
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // admin, active.
  {
    userId: 'seed-0007-active-admin',
    role: 'admin',
    authStatus: 'active',
    username: 'admin.registrar.seed',
    firstName: 'Priya',
    lastName: 'Jayasuriya',
    nameWithInitials: 'P. Jayasuriya',
    dateOfBirth: ISODate('1980-04-18'),
    nic: '800880045678',
    primaryEmail: 'registrar.seed@uom.lk',
    gender: 'Female',
    mobileNo: '0715556677',
    staffDetails: {
      departmentDivision: "Registrar's Office",
      designation: 'Deputy Registrar',
      category: 'Admin',
    },
    createdBy: adminId,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]);

print(
  'Seeded ' + db.users.countDocuments({}) + ' users, ' +
  db.bulkUploadBatches.countDocuments({}) + ' batch(es).',
);
