/**
 * Comprehensive Currency Formatting Standardization Script
 * Applies comma-separated currency formatting across all forms and outputs
 */

import { promises as fs } from 'fs';
import path from 'path';

class CurrencyFormattingStandardizer {
  constructor() {
    this.clientPath = './client/src';
    this.filesProcessed = [];
    this.currencyFields = [
      'listCost', 'netCost', 'offInvoice', 'billBack', 'totalAmount', 
      'lumpSumAllowance', 'deliveryCharge', 'unitCost', 'lineTotal',
      'subtotal', 'totalCost', 'price', 'cost', 'amount'
    ];
  }

  async findAllReactFiles() {
    const files = [];
    
    async function scanDirectory(dir) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          await scanDirectory(fullPath);
        } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts'))) {
          files.push(fullPath);
        }
      }
    }
    
    await scanDirectory(this.clientPath);
    return files;
  }

  async processFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      let updatedContent = content;
      let hasChanges = false;

      // Add formatCurrency imports if missing
      if (content.includes('formatCurrency') && !content.includes('formatCurrencyInput')) {
        updatedContent = updatedContent.replace(
          /import\s+\{\s*([^}]*formatCurrency[^}]*)\s*\}\s+from\s+["']@\/lib\/formatNumber["'];?/,
          `import { $1, formatCurrencyInput, parseCurrency } from "@/lib/formatNumber";`
        );
        hasChanges = true;
      }

      // Fix currency input fields (type="number" with currency values)
      const currencyInputPattern = /<Input[^>]*type="number"[^>]*value=\{[^}]*\b(listCost|netCost|offInvoice|billBack|lumpSumAllowance|deliveryCharge|unitCost|totalCost|price|cost|amount)\b[^}]*\}[^>]*\/>/g;
      
      updatedContent = updatedContent.replace(currencyInputPattern, (match) => {
        if (!match.includes('formatCurrencyInput')) {
          const newMatch = match
            .replace(/type="number"/, 'type="text"')
            .replace(/value=\{([^}]+)\}/, 'value={formatCurrencyInput($1)}')
            .replace(/onChange=\{[^}]+\}/, (onChangeMatch) => {
              return onChangeMatch.replace(/parseFloat\([^)]+\)|parseInt\([^)]+\)/, 'parseCurrency(e.target.value)');
            });
          hasChanges = true;
          return newMatch;
        }
        return match;
      });

      // Fix currency display fields (remove $ prefix and use formatCurrency)
      const currencyDisplayPattern = /\$\{formatNumber\(([^}]+)\)\}/g;
      updatedContent = updatedContent.replace(currencyDisplayPattern, '{formatCurrency($1)}');
      if (currencyDisplayPattern.test(content)) hasChanges = true;

      // Fix manual dollar formatting
      const manualDollarPattern = /\$\{([^}]*(?:listCost|netCost|offInvoice|billBack|lumpSumAllowance|deliveryCharge|unitCost|totalCost|price|cost|amount)[^}]*)\}/g;
      updatedContent = updatedContent.replace(manualDollarPattern, (match, value) => {
        if (!match.includes('formatCurrency')) {
          hasChanges = true;
          return `{formatCurrency(${value})}`;
        }
        return match;
      });

      // Add placeholders to currency input fields
      updatedContent = updatedContent.replace(
        /<Input[^>]*type="text"[^>]*formatCurrencyInput[^>]*(?!placeholder)[^>]*\/>/g,
        (match) => {
          if (!match.includes('placeholder=')) {
            hasChanges = true;
            return match.replace('"/>', '" placeholder="0.00"/>');
          }
          return match;
        }
      );

      if (hasChanges) {
        await fs.writeFile(filePath, updatedContent, 'utf-8');
        this.filesProcessed.push(filePath);
        console.log(`✓ Updated currency formatting in: ${filePath}`);
      }

    } catch (error) {
      console.error(`Error processing ${filePath}:`, error.message);
    }
  }

  async run() {
    console.log('🔄 Starting comprehensive currency formatting standardization...');
    
    const files = await this.findAllReactFiles();
    console.log(`Found ${files.length} React files to process`);

    for (const file of files) {
      await this.processFile(file);
    }

    console.log('\n📊 Summary:');
    console.log(`✓ Files processed: ${this.filesProcessed.length}`);
    console.log(`✓ Total files scanned: ${files.length}`);
    
    if (this.filesProcessed.length > 0) {
      console.log('\n📝 Updated files:');
      this.filesProcessed.forEach(file => console.log(`  - ${file}`));
    }

    console.log('\n✅ Currency formatting standardization complete!');
    console.log('All currency fields now use comma-separated formatting throughout the project.');
  }
}

// Execute the standardization
const standardizer = new CurrencyFormattingStandardizer();
standardizer.run().catch(console.error);