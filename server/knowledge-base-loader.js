const fs = require('fs');
const path = require('path');

class KnowledgeBaseLoader {
  static instance = null;

  constructor() {
    this.knowledgeBase = '';
    this.competitors = [];
    this.loaded = false;
  }

  static getInstance() {
    if (!KnowledgeBaseLoader.instance) {
      KnowledgeBaseLoader.instance = new KnowledgeBaseLoader();
      KnowledgeBaseLoader.instance.load();
    }
    return KnowledgeBaseLoader.instance;
  }

  load() {
    try {
      // Load BYD Shark 6 knowledge base
      const kbPath = path.join(__dirname, '../knowledge-base/byd-shark-6.txt');
      if (fs.existsSync(kbPath)) {
        this.knowledgeBase = fs.readFileSync(kbPath, 'utf-8');
        console.log('✅ Loaded BYD Shark 6 knowledge base');
      } else {
        console.warn('⚠️ BYD Shark 6 knowledge base not found, creating placeholder');
        this.knowledgeBase = this.createPlaceholderKnowledgeBase();
      }

      // Load competitor data
      const competitorsDir = path.join(__dirname, '../knowledge-base/competitors');
      if (fs.existsSync(competitorsDir)) {
        const files = fs.readdirSync(competitorsDir);
        files.forEach(file => {
          if (file.endsWith('.json')) {
            const filePath = path.join(competitorsDir, file);
            const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            this.competitors.push(data);
          }
        });
        console.log(`✅ Loaded ${this.competitors.length} competitor profiles`);
      } else {
        console.warn('⚠️ Competitors directory not found');
      }

      this.loaded = true;

    } catch (error) {
      console.error('Error loading knowledge base:', error);
      this.knowledgeBase = this.createPlaceholderKnowledgeBase();
      this.loaded = true;
    }
  }

  createPlaceholderKnowledgeBase() {
    return `BYD SHARK 6 - SPECIFICATIONS AND FEATURES

OVERVIEW:
The BYD Shark 6 is a revolutionary plug-in hybrid electric pickup truck (PHEV) that combines exceptional power, efficiency, and technology.

ENGINE & PERFORMANCE:
- Powertrain: Plug-in Hybrid Electric (PHEV)
- System Power: 430 HP combined
- Torque: 650 Nm
- 0-100 km/h: 5.7 seconds
- Top Speed: 160 km/h
- Electric Range: 100 km (pure EV mode)
- Total Range: 800+ km (with full tank and battery)

DRIVETRAIN:
- 4WD (Four-Wheel Drive)
- Electronic differential lock
- Multiple driving modes: EV, Hybrid, Sport

BATTERY & CHARGING:
- Battery Capacity: 29.6 kWh
- Charging Time: 3-4 hours (AC charger)
- Fast Charging: 30 minutes to 80% (DC)

TOWING & PAYLOAD:
- Towing Capacity: 2,500 kg
- Payload: 835 kg
- Bed Length: 1,500 mm

DIMENSIONS:
- Length: 5,457 mm
- Width: 1,971 mm
- Height: 1,925 mm
- Wheelbase: 3,260 mm

TECHNOLOGY:
- 12.8" Rotating Touchscreen
- DiLink 4.0 Intelligent System
- Apple CarPlay & Android Auto
- 360° Camera System
- Advanced Driver Assistance (ADAS)
- Voice Control

SAFETY:
- 7 Airbags
- ABS with EBD
- Traction Control
- Hill Descent Control
- Lane Keeping Assist
- Adaptive Cruise Control

PRICE:
- Starting from $49,990 AUD

KEY ADVANTAGES:
- Lower running costs (electric + fuel efficiency)
- Exceptional towing capacity for a hybrid
- Advanced technology features
- Environmentally friendly
- No range anxiety (PHEV advantage)`;
  }

  getKnowledgeBase() {
    return this.knowledgeBase;
  }

  getCompetitors() {
    return this.competitors;
  }

  reload() {
    this.load();
  }
}

module.exports = KnowledgeBaseLoader;
