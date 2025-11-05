const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testCampaignCreation() {
  try {
    // First, let's find a school to use
    const school = await prisma.school.findFirst()
    
    if (!school) {
      console.log('No school found. Please create a school first.')
      return
    }

    console.log('Using school:', school.name)

    // Create a test campaign with the reach field
    const campaign = await prisma.campaign.create({
      data: {
        title: 'Test Campaign with Reach',
        description: 'This is a test campaign to verify the reach field works',
        type: 'EMAIL',
        status: 'DRAFT',
        budget: 500000,
        targetAudience: 'Parents with children age 5-17',
        reach: 1000,
        schoolId: school.id
      },
      include: {
        school: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    console.log('Campaign created successfully:')
    console.log('ID:', campaign.id)
    console.log('Title:', campaign.title)
    console.log('Type:', campaign.type)
    console.log('Status:', campaign.status)
    console.log('Budget:', campaign.budget)
    console.log('Reach:', campaign.reach)
    console.log('School:', campaign.school.name)
    console.log('Created at:', campaign.created_at)

    // Now let's test updating the campaign
    const updatedCampaign = await prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        reach: 1500,
        status: 'ACTIVE'
      }
    })

    console.log('\nCampaign updated successfully:')
    console.log('New reach:', updatedCampaign.reach)
    console.log('New status:', updatedCampaign.status)

    // Clean up - delete the test campaign
    await prisma.campaign.delete({
      where: { id: campaign.id }
    })

    console.log('\nTest campaign deleted successfully')
    console.log('✅ All tests passed! The reach field is working correctly.')

  } catch (error) {
    console.error('Error testing campaign creation:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testCampaignCreation()