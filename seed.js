const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// This script seeds initial data for testing
async function seedDatabase() {
  console.log('🌱 Seeding database...');
  
  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const adminUser = {
    id: uuidv4(),
    email: 'admin@beverlytech.ai',
    username: 'admin',
    password: adminPassword,
    role: 'admin',
    createdAt: new Date().toISOString(),
    lastLogin: null
  };
  
  // Create demo user
  const demoPassword = await bcrypt.hash('demo123', 10);
  const demoUser = {
    id: uuidv4(),
    email: 'demo@beverlytech.ai',
    username: 'demo',
    password: demoPassword,
    role: 'user',
    createdAt: new Date().toISOString(),
    lastLogin: null
  };
  
  console.log('✅ Admin user created:');
  console.log('   Email: admin@beverlytech.ai');
  console.log('   Password: admin123');
  console.log('');
  console.log('✅ Demo user created:');
  console.log('   Email: demo@beverlytech.ai');
  console.log('   Password: demo123');
  
  return { adminUser, demoUser };
}

module.exports = { seedDatabase };

// If run directly
if (require.main === module) {
  seedDatabase().then(() => {
    console.log('\n🎉 Seeding complete!');
    process.exit(0);
  }).catch(err => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  });
}
