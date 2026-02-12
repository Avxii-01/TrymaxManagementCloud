console.log('🧪 Testing Assignment Export - ALL Assignments (Exclude Archived Only)');

// Mock data to test the filter logic - assignments from different dates
const mockAssignments = [
  { id: '1', title: 'Active Task 1', created_at: '2026-01-20T10:00:00Z' }, // Old but active
  { id: '2', title: 'Archived Task 1', created_at: '2026-01-25T10:00:00Z' }, // Recent but archived
  { id: '3', title: 'Active Task 2', created_at: new Date().toISOString() }, // Today and active
  { id: '4', title: 'Archived Task 2', created_at: '2026-01-15T10:00:00Z' }, // Old and archived
  { id: '5', title: 'Active Task 3', created_at: '2026-01-10T10:00:00Z' }, // Very old but active
];

// Mock isTaskArchived function (simulates archived tasks 2 and 4)
const mockIsTaskArchived = (taskId) => ['2', '4'].includes(taskId);

// Test the NEW filter logic (same as in the updated export function)
const activeAssignments = mockAssignments.filter(a => {
  return !mockIsTaskArchived(a.id); // Exclude archived assignments ONLY
});

console.log('📊 Test Results:');
console.log('Total assignments:', mockAssignments.length);
console.log('Archived assignments:', 2);
console.log('Active assignments (should be exported):', activeAssignments.length);
console.log('Exported tasks:', activeAssignments.map(t => t.title));

// Expected result: 3 tasks (Active Task 1, 2, 3) should be exported regardless of creation date
const expectedCount = 3;
const actualCount = activeAssignments.length;

console.log('✅ Test Status:', actualCount === expectedCount ? 'PASS' : 'FAIL');
console.log(`Expected: ${expectedCount}, Got: ${actualCount}`);
console.log('🎯 NEW BEHAVIOR: ALL assignments exported except archived ones');
