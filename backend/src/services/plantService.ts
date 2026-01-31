import { query, withTransaction } from '../config/database';

// ===================================
// Types
// ===================================

export interface Garden {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  location: string | null;
  created_at: Date;
  updated_at: Date;
  plant_count?: number;
}

export interface PlantCatalog {
  id: number;
  category_id: number | null;
  name: string;
  name_fa: string;
  scientific_name: string | null;
  description: string | null;
  description_fa: string | null;
  main_image_url: string | null;
  
  // Care requirements
  watering_interval_days: number;
  watering_amount: string | null;
  watering_tips: string | null;
  light_requirement: 'direct' | 'indirect' | 'behind_curtain' | 'low_light' | 'no_light' | null;
  light_description: string | null;
  min_temperature: number | null;
  max_temperature: number | null;
  ideal_temperature: number | null;
  temperature_tips: string | null;
  needs_humidifier: boolean;
  humidity_level: 'low' | 'medium' | 'high' | null;
  humidity_tips: string | null;
  fertilizer_interval_days: number;
  fertilizer_type: string | null;
  fertilizer_tips: string | null;
  
  difficulty_level: 'easy' | 'medium' | 'hard' | null;
  is_toxic_to_pets: boolean;
  is_air_purifying: boolean;
  
  created_at: Date;
  updated_at: Date;
}

export interface UserPlant {
  id: number;
  user_id: number;
  garden_id: number;
  plant_id: number;
  
  nickname: string | null;
  custom_watering_interval: number | null;
  custom_fertilizer_interval: number | null;
  notes: string | null;
  
  health_status: 'healthy' | 'needs_attention' | 'sick' | 'recovering';
  acquired_date: Date | null;
  
  last_watered_at: Date | null;
  next_watering_at: Date | null;
  last_fertilized_at: Date | null;
  next_fertilizing_at: Date | null;
  
  is_favorite: boolean;
  created_at: Date;
  updated_at: Date;
  
  // Joined data from plant catalog
  plant_name?: string;
  plant_name_fa?: string;
  plant_scientific_name?: string | null;
  plant_image?: string | null;
  additional_images?: string[];
}

export interface CareActivity {
  id: number;
  user_plant_id: number;
  user_id: number;
  activity_type: 'watering' | 'fertilizing' | 'pruning' | 'repotting' | 'pest_treatment' | 'other';
  notes: string | null;
  performed_at: Date;
  created_at: Date;
}

export interface PlantCategory {
  id: number;
  name: string;
  name_fa: string;
  icon: string | null;
  description: string | null;
}

// ===================================
// Garden Functions
// ===================================

export const getGardensByUser = async (userId: number): Promise<Garden[]> => {
  const result = await query(`
    SELECT 
      g.*,
      COUNT(up.id)::int as plant_count
    FROM gardens g
    LEFT JOIN user_plants up ON g.id = up.garden_id
    WHERE g.user_id = $1
    GROUP BY g.id
    ORDER BY g.created_at DESC
  `, [userId]);
  
  return result.rows;
};

export const getGardenById = async (gardenId: number, userId: number): Promise<Garden | null> => {
  const result = await query(`
    SELECT 
      g.*,
      COUNT(up.id)::int as plant_count
    FROM gardens g
    LEFT JOIN user_plants up ON g.id = up.garden_id
    WHERE g.id = $1 AND g.user_id = $2
    GROUP BY g.id
  `, [gardenId, userId]);
  
  return result.rows[0] || null;
};

export const createGarden = async (userId: number, name: string, description?: string, location?: string): Promise<Garden> => {
  const result = await query(`
    INSERT INTO gardens (user_id, name, description, location)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `, [userId, name, description || null, location || null]);
  
  return result.rows[0];
};

export const updateGarden = async (
  gardenId: number,
  userId: number,
  updates: { name?: string; description?: string; location?: string }
): Promise<Garden | null> => {
  const setClauses: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;
  
  if (updates.name !== undefined) {
    setClauses.push(`name = $${paramIndex++}`);
    values.push(updates.name);
  }
  if (updates.description !== undefined) {
    setClauses.push(`description = $${paramIndex++}`);
    values.push(updates.description);
  }
  if (updates.location !== undefined) {
    setClauses.push(`location = $${paramIndex++}`);
    values.push(updates.location);
  }
  
  if (setClauses.length === 0) return null;
  
  setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(gardenId, userId);
  
  const result = await query(`
    UPDATE gardens
    SET ${setClauses.join(', ')}
    WHERE id = $${paramIndex++} AND user_id = $${paramIndex++}
    RETURNING *
  `, values);
  
  return result.rows[0] || null;
};

export const deleteGarden = async (gardenId: number, userId: number): Promise<boolean> => {
  const result = await query(`
    DELETE FROM gardens
    WHERE id = $1 AND user_id = $2
    RETURNING id
  `, [gardenId, userId]);
  
  return result.rows.length > 0;
};

// ===================================
// Plant Catalog Functions
// ===================================

export const getAllPlantsFromCatalog = async (): Promise<PlantCatalog[]> => {
  const result = await query(`
    SELECT * FROM plants
    ORDER BY name_fa
  `);
  
  return result.rows;
};

export const getPlantFromCatalog = async (plantId: number): Promise<PlantCatalog | null> => {
  const result = await query(`
    SELECT * FROM plants
    WHERE id = $1
  `, [plantId]);
  
  return result.rows[0] || null;
};

export const searchPlantsInCatalog = async (searchTerm: string): Promise<PlantCatalog[]> => {
  const result = await query(`
    SELECT * FROM plants
    WHERE 
      name ILIKE $1 OR 
      name_fa ILIKE $1 OR 
      scientific_name ILIKE $1 OR
      description ILIKE $1 OR
      description_fa ILIKE $1
    ORDER BY name_fa
    LIMIT 50
  `, [`%${searchTerm}%`]);
  
  return result.rows;
};

export const createPlantInCatalog = async (plantData: Partial<PlantCatalog>): Promise<PlantCatalog> => {
  const result = await query(`
    INSERT INTO plants (
      category_id, name, name_fa, scientific_name, description, description_fa,
      main_image_url, watering_interval_days, watering_amount, watering_tips,
      light_requirement, light_description, min_temperature, max_temperature,
      ideal_temperature, temperature_tips, needs_humidifier, humidity_level,
      humidity_tips, fertilizer_interval_days, fertilizer_type, fertilizer_tips,
      difficulty_level, is_toxic_to_pets, is_air_purifying
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
    RETURNING *
  `, [
    plantData.category_id,
    plantData.name,
    plantData.name_fa,
    plantData.scientific_name,
    plantData.description,
    plantData.description_fa,
    plantData.main_image_url,
    plantData.watering_interval_days || 7,
    plantData.watering_amount,
    plantData.watering_tips,
    plantData.light_requirement,
    plantData.light_description,
    plantData.min_temperature,
    plantData.max_temperature,
    plantData.ideal_temperature,
    plantData.temperature_tips,
    plantData.needs_humidifier || false,
    plantData.humidity_level,
    plantData.humidity_tips,
    plantData.fertilizer_interval_days || 30,
    plantData.fertilizer_type,
    plantData.fertilizer_tips,
    plantData.difficulty_level,
    plantData.is_toxic_to_pets || false,
    plantData.is_air_purifying || false
  ]);
  
  return result.rows[0];
};

// ===================================
// User Plant Functions (نمونه‌های کاربران)
// ===================================

export const getPlantsByGarden = async (gardenId: number, userId: number): Promise<UserPlant[]> => {
  const result = await query(`
    SELECT 
      up.*,
      p.name as plant_name,
      p.name_fa as plant_name_fa,
      p.scientific_name as plant_scientific_name,
      p.main_image_url as plant_image
    FROM user_plants up
    INNER JOIN plants p ON up.plant_id = p.id
    WHERE up.garden_id = $1 AND up.user_id = $2
    ORDER BY up.created_at DESC
  `, [gardenId, userId]);
  
  return result.rows;
};

export const getAllUserPlants = async (userId: number): Promise<UserPlant[]> => {
  const result = await query(`
    SELECT 
      up.*,
      p.name as plant_name,
      p.name_fa as plant_name_fa,
      p.scientific_name as plant_scientific_name,
      p.main_image_url as plant_image,
      p.watering_interval_days as default_watering_interval,
      p.fertilizer_interval_days as default_fertilizer_interval,
      COALESCE(up.custom_watering_interval, p.watering_interval_days) as effective_watering_interval,
      g.name as garden_name
    FROM user_plants up
    INNER JOIN plants p ON up.plant_id = p.id
    INNER JOIN gardens g ON up.garden_id = g.id
    WHERE up.user_id = $1
    ORDER BY up.created_at DESC
  `, [userId]);
  
  return result.rows;
};

export const getUserPlantById = async (userPlantId: number, userId: number): Promise<UserPlant | null> => {
  const result = await query(`
    SELECT 
      up.*,
      p.name as plant_name,
      p.name_fa as plant_name_fa,
      p.scientific_name as plant_scientific_name,
      p.description_fa as description_fa,
      p.main_image_url as plant_image,
      p.watering_interval_days as default_watering_interval,
      p.watering_tips as watering_tips,
      p.light_requirement as light_requirement,
      p.light_description as light_description,
      p.min_temperature as min_temperature,
      p.max_temperature as max_temperature,
      p.humidity_level as humidity_level,
      p.humidity_tips as humidity_tips,
      p.fertilizer_interval_days as default_fertilizer_interval,
      p.fertilizer_tips as fertilizer_tips,
      p.difficulty_level as difficulty_level,
      p.is_toxic_to_pets as is_toxic_to_pets,
      p.is_air_purifying as is_air_purifying,
      COALESCE(up.custom_watering_interval, p.watering_interval_days) as effective_watering_interval,
      (
        SELECT COALESCE(array_agg(image_url), '{}')
        FROM plant_images
        WHERE plant_id = p.id
      ) as additional_images
    FROM user_plants up
    INNER JOIN plants p ON up.plant_id = p.id
    WHERE up.id = $1 AND up.user_id = $2
  `, [userPlantId, userId]);
  
  return result.rows[0] || null;
};

export const createPlant = async (
  userId: number,
  gardenId: number,
  plantId: number,
  data?: {
    nickname?: string;
    custom_watering_interval?: number;
    custom_fertilizer_interval?: number;
    acquired_date?: Date;
    notes?: string;
  }
): Promise<UserPlant> => {
  // Get plant info to calculate next watering/fertilizing
  const plantInfo = await getPlantFromCatalog(plantId);
  if (!plantInfo) {
    throw new Error('Plant not found in catalog');
  }
  
  const wateringInterval = data?.custom_watering_interval || plantInfo.watering_interval_days;
  const fertilizerInterval = data?.custom_fertilizer_interval || plantInfo.fertilizer_interval_days;
  
  const now = new Date();
  // فرض می‌کنیم گیاه همین الان آبیاری شده و بر اساس بازه آبیاری، زمان آبیاری بعدی محاسبه می‌شود
  const nextWatering = new Date(now.getTime() + wateringInterval * 24 * 60 * 60 * 1000);
  const nextFertilizing = new Date(now.getTime() + fertilizerInterval * 24 * 60 * 60 * 1000);
  
  const result = await query(`
    INSERT INTO user_plants (
      user_id, garden_id, plant_id, nickname,
      custom_watering_interval, custom_fertilizer_interval,
      acquired_date, notes, last_watered_at, next_watering_at, 
      last_fertilized_at, next_fertilizing_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *
  `, [
    userId,
    gardenId,
    plantId,
    data?.nickname || null,
    data?.custom_watering_interval || null,
    data?.custom_fertilizer_interval || null,
    data?.acquired_date || null,
    data?.notes || null,
    now, // last_watered_at - فرض می‌کنیم همین الان آبیاری شده
    nextWatering,
    now, // last_fertilized_at - فرض می‌کنیم همین الان کود داده شده
    nextFertilizing
  ]);
  
  return result.rows[0];
};

export const updatePlant = async (
  userPlantId: number,
  userId: number,
  updates: {
    nickname?: string;
    custom_watering_interval?: number;
    custom_fertilizer_interval?: number;
    health_status?: 'healthy' | 'needs_attention' | 'sick' | 'recovering';
    notes?: string;
    is_favorite?: boolean;
    last_watered_at?: string;
    next_watering_at?: string;
    last_fertilized_at?: string;
    next_fertilizing_at?: string;
  }
): Promise<UserPlant | null> => {
  const setClauses: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;
  
  if (updates.nickname !== undefined) {
    setClauses.push(`nickname = $${paramIndex++}`);
    values.push(updates.nickname);
  }
  if (updates.custom_watering_interval !== undefined) {
    setClauses.push(`custom_watering_interval = $${paramIndex++}`);
    values.push(updates.custom_watering_interval);
  }
  if (updates.custom_fertilizer_interval !== undefined) {
    setClauses.push(`custom_fertilizer_interval = $${paramIndex++}`);
    values.push(updates.custom_fertilizer_interval);
  }
  if (updates.health_status !== undefined) {
    setClauses.push(`health_status = $${paramIndex++}`);
    values.push(updates.health_status);
  }
  if (updates.notes !== undefined) {
    setClauses.push(`notes = $${paramIndex++}`);
    values.push(updates.notes);
  }
  if (updates.is_favorite !== undefined) {
    setClauses.push(`is_favorite = $${paramIndex++}`);
    values.push(updates.is_favorite);
  }
  if (updates.last_watered_at !== undefined) {
    setClauses.push(`last_watered_at = $${paramIndex++}`);
    values.push(updates.last_watered_at);
  }
  if (updates.next_watering_at !== undefined) {
    setClauses.push(`next_watering_at = $${paramIndex++}`);
    values.push(updates.next_watering_at);
  }
  if (updates.last_fertilized_at !== undefined) {
    setClauses.push(`last_fertilized_at = $${paramIndex++}`);
    values.push(updates.last_fertilized_at);
  }
  if (updates.next_fertilizing_at !== undefined) {
    setClauses.push(`next_fertilizing_at = $${paramIndex++}`);
    values.push(updates.next_fertilizing_at);
  }
  
  if (setClauses.length === 0) return null;
  
  setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(userPlantId, userId);
  
  const result = await query(`
    UPDATE user_plants
    SET ${setClauses.join(', ')}
    WHERE id = $${paramIndex++} AND user_id = $${paramIndex++}
    RETURNING *
  `, values);
  
  return result.rows[0] || null;
};

export const deletePlant = async (userPlantId: number, userId: number): Promise<boolean> => {
  const result = await query(`
    DELETE FROM user_plants
    WHERE id = $1 AND user_id = $2
    RETURNING id
  `, [userPlantId, userId]);
  
  return result.rows.length > 0;
};

// ===================================
// Care Activity Functions
// ===================================

export const recordCareActivity = async (
  userPlantId: number,
  userId: number,
  activityType: 'watering' | 'fertilizing' | 'pruning' | 'repotting' | 'pest_treatment' | 'other',
  notes?: string
): Promise<CareActivity> => {
  return await withTransaction(async (client) => {
    // Record activity
    const activityResult = await client.query(`
      INSERT INTO care_activities (user_plant_id, user_id, activity_type, notes)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [userPlantId, userId, activityType, notes || null]);
    
    // Update plant's last activity timestamp
    const now = new Date();
    
    if (activityType === 'watering') {
      // Get watering interval
      const plantResult = await client.query(`
        SELECT 
          COALESCE(up.custom_watering_interval, p.watering_interval_days) as interval_days
        FROM user_plants up
        INNER JOIN plants p ON up.plant_id = p.id
        WHERE up.id = $1
      `, [userPlantId]);
      
      const intervalDays = Math.max(1, plantResult.rows[0]?.interval_days || 7);
      const nextWatering = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);
      
      console.log(`[Watering] Plant ${userPlantId}: Interval ${intervalDays} days. Setting next watering to ${nextWatering.toISOString()}`);

      const updateResult = await client.query(`
        UPDATE user_plants
        SET last_watered_at = $1, next_watering_at = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, [now, nextWatering, userPlantId]);

      console.log(`[Watering] Updated ${updateResult.rowCount} rows for plant ${userPlantId}`);
      if (updateResult.rowCount === 0) {
        throw new Error(`Plant with ID ${userPlantId} not found or not updated.`);
      }
    } else if (activityType === 'fertilizing') {
      // Get fertilizer interval
      const plantResult = await client.query(`
        SELECT 
          COALESCE(up.custom_fertilizer_interval, p.fertilizer_interval_days) as interval_days
        FROM user_plants up
        INNER JOIN plants p ON up.plant_id = p.id
        WHERE up.id = $1
      `, [userPlantId]);
      
      const intervalDays = plantResult.rows[0]?.interval_days || 30;
      const nextFertilizing = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);
      
      await client.query(`
        UPDATE user_plants
        SET last_fertilized_at = $1, next_fertilizing_at = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, [now, nextFertilizing, userPlantId]);
    }
    
    return activityResult.rows[0];
  });
};

export const getCareActivities = async (userPlantId: number, userId: number): Promise<CareActivity[]> => {
  const result = await query(`
    SELECT ca.*
    FROM care_activities ca
    INNER JOIN user_plants up ON ca.user_plant_id = up.id
    WHERE ca.user_plant_id = $1 AND up.user_id = $2
    ORDER BY ca.performed_at DESC
    LIMIT 50
  `, [userPlantId, userId]);
  
  return result.rows;
};

// ===================================
// Statistics & Reports
// ===================================

export const getPlantsNeedingWater = async (userId: number): Promise<UserPlant[]> => {
  const result = await query(`
    SELECT 
      up.*,
      p.name as plant_name,
      p.name_fa as plant_name_fa,
      p.scientific_name as plant_scientific_name,
      p.main_image_url as plant_image,
      g.name as garden_name
    FROM user_plants up
    INNER JOIN plants p ON up.plant_id = p.id
    INNER JOIN gardens g ON up.garden_id = g.id
    WHERE up.user_id = $1 
      AND up.next_watering_at IS NOT NULL
      AND up.next_watering_at <= CURRENT_TIMESTAMP + INTERVAL '1 day'
    ORDER BY up.next_watering_at ASC
  `, [userId]);
  
  return result.rows;
};

export const getUserStats = async (userId: number) => {
  const statsResult = await query(`
    SELECT 
      COUNT(DISTINCT g.id)::int as total_gardens,
      COUNT(DISTINCT up.id)::int as total_plants,
      COUNT(DISTINCT CASE WHEN up.is_favorite THEN up.id END)::int as favorite_plants,
      COUNT(DISTINCT CASE WHEN up.next_watering_at <= CURRENT_TIMESTAMP THEN up.id END)::int as plants_need_water
    FROM gardens g
    LEFT JOIN user_plants up ON g.id = up.garden_id AND g.user_id = up.user_id
    WHERE g.user_id = $1
  `, [userId]);
  
  const recentActivitiesResult = await query(`
    SELECT COUNT(*)::int as total_activities
    FROM care_activities ca
    INNER JOIN user_plants up ON ca.user_plant_id = up.id
    WHERE up.user_id = $1 AND ca.performed_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'
  `, [userId]);
  
  return {
    ...statsResult.rows[0],
    recent_activities: recentActivitiesResult.rows[0].total_activities
  };
};

// ===================================
// Category Functions
// ===================================

export const getAllCategories = async (): Promise<PlantCategory[]> => {
  const result = await query(`
    SELECT * FROM plant_categories
    ORDER BY name_fa
  `);
  
  return result.rows;
};
