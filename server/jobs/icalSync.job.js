import cron from 'node-cron';
import prisma from '../config/database.js';
import nodeIcal from 'node-ical';

// Sync a single property's iCal
async function syncPropertyIcal(property) {
  const iCalUrls = property.iCalUrls || [];

  if (iCalUrls.length === 0) {
    return { propertyId: property.id, imported: 0, skipped: 0, errors: [] };
  }

  let imported = 0;
  let skipped = 0;
  let errors = [];

  for (const calendarSource of iCalUrls) {
    try {
      const events = await nodeIcal.async.fromURL(calendarSource.url);

      for (const [key, event] of Object.entries(events)) {
        if (event.type !== 'VEVENT') continue;

        const uid = event.uid;
        const start = new Date(event.start);
        const end = new Date(event.end);

        // Skip invalid dates
        if (isNaN(start.getTime()) || isNaN(end.getTime())) continue;

        // Skip past events (ended more than 7 days ago)
        if (end < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) continue;

        // Check if booking already exists
        const existing = await prisma.booking.findFirst({
          where: {
            propertyId: property.id,
            iCalUid: uid,
          },
        });

        if (existing) {
          // Update dates if changed
          if (existing.checkIn.getTime() !== start.getTime() ||
              existing.checkOut.getTime() !== end.getTime()) {
            const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
            await prisma.booking.update({
              where: { id: existing.id },
              data: {
                checkIn: start,
                checkOut: end,
                nights,
              },
            });
            imported++;
          } else {
            skipped++;
          }
          continue;
        }

        // Calculate nights
        const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

        // Extract guest name from summary
        const summary = event.summary || 'Prenotazione esterna';
        let guestName = summary;

        // Try to clean up common iCal summary formats
        if (summary.includes(' - ')) {
          guestName = summary.split(' - ')[0];
        } else if (summary.toLowerCase().includes('reserved') ||
                   summary.toLowerCase().includes('blocked') ||
                   summary.toLowerCase().includes('not available') ||
                   summary.toLowerCase().includes('airbnb')) {
          guestName = 'Blocco calendario';
        }

        // Find matching channel by name
        const channels = await prisma.channel.findMany({
          where: { userId: property.userId }
        });

        const sourceLower = calendarSource.name.toLowerCase();
        const channel = channels.find(c =>
          sourceLower.includes(c.name.toLowerCase()) ||
          c.name.toLowerCase().includes(sourceLower)
        );

        // Create new booking
        await prisma.booking.create({
          data: {
            userId: property.userId,
            propertyId: property.id,
            channelId: channel?.id || null,
            guestName,
            checkIn: start,
            checkOut: end,
            nights,
            numberOfGuests: 1,
            iCalUid: uid,
            iCalSource: calendarSource.name,
            grossRevenue: 0,
            commissionRate: channel?.commissionRate || 0,
            commissionAmount: 0,
            netRevenue: 0,
            netMargin: 0,
            status: 'CONFIRMED',
            notes: event.description || null,
          },
        });

        imported++;
      }
    } catch (err) {
      errors.push({ source: calendarSource.name, error: err.message });
    }
  }

  // Update last sync time
  await prisma.property.update({
    where: { id: property.id },
    data: { iCalLastSync: new Date() },
  });

  return { propertyId: property.id, propertyName: property.name, imported, skipped, errors };
}

// Sync all properties with iCal URLs
async function syncAllProperties() {
  console.log(`[iCal Sync] Starting automatic sync at ${new Date().toISOString()}`);

  try {
    // Find all properties with iCal URLs configured
    const properties = await prisma.property.findMany({
      where: {
        iCalUrls: { not: null }
      },
      select: {
        id: true,
        name: true,
        userId: true,
        iCalUrls: true,
      }
    });

    // Filter properties that actually have URLs in the array
    const propertiesWithUrls = properties.filter(p =>
      Array.isArray(p.iCalUrls) && p.iCalUrls.length > 0
    );

    if (propertiesWithUrls.length === 0) {
      console.log('[iCal Sync] No properties with iCal URLs configured');
      return;
    }

    console.log(`[iCal Sync] Found ${propertiesWithUrls.length} properties to sync`);

    let totalImported = 0;
    let totalSkipped = 0;
    let totalErrors = [];

    for (const property of propertiesWithUrls) {
      const result = await syncPropertyIcal(property);
      totalImported += result.imported;
      totalSkipped += result.skipped;
      if (result.errors.length > 0) {
        totalErrors.push({ property: result.propertyName, errors: result.errors });
      }

      console.log(`[iCal Sync] ${property.name}: ${result.imported} imported, ${result.skipped} skipped`);
    }

    console.log(`[iCal Sync] Complete: ${totalImported} new/updated, ${totalSkipped} unchanged`);

    if (totalErrors.length > 0) {
      console.log('[iCal Sync] Errors:', JSON.stringify(totalErrors, null, 2));
    }
  } catch (error) {
    console.error('[iCal Sync] Error:', error.message);
  }
}

// Schedule cron job - every 30 minutes
export function startIcalSyncJob() {
  // Run every 30 minutes: "*/30 * * * *"
  cron.schedule('*/30 * * * *', () => {
    syncAllProperties();
  });

  console.log('[iCal Sync] Scheduled automatic sync every 30 minutes');

  // Also run immediately on startup (after 10 seconds to let server initialize)
  setTimeout(() => {
    console.log('[iCal Sync] Running initial sync...');
    syncAllProperties();
  }, 10000);
}

export { syncAllProperties };
