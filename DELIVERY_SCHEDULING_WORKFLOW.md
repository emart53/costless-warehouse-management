# Delivery Scheduling Workflow Guide

## Overview
The delivery scheduling system coordinates vendor deliveries with warehouse operations, ensuring efficient dock management and proper coordination between purchase orders and delivery logistics.

## When to Use Delivery Scheduling

### Purchase Order Status Requirements
- **Schedule Button Appears**: Only when Purchase Order status is "Submitted"
- **Purpose**: Coordinate delivery timing after purchase order has been approved but before shipment

### Delivery Windows
The system supports specific delivery windows to optimize warehouse operations:

- **Tuesday**: 5:00 AM - 1:30 PM (8.5 hours)
- **Wednesday**: 5:00 AM - 9:00 PM (16 hours) 
- **Friday**: 5:00 AM - 9:00 PM (16 hours)
- **Monday/Thursday**: Not available for regular deliveries (exception handling required)

### Time Slot Management
- **Interval**: 30-minute time slots
- **Selection**: Drop-down menu with available times
- **Capacity**: System prevents double-booking of dock resources

## Step-by-Step Workflow

### 1. Accessing Delivery Scheduling
1. Navigate to Purchase Order List
2. Locate purchase order with "Submitted" status
3. Click **Schedule** button in the Actions column
4. Delivery Scheduling Modal opens automatically

### 2. Pre-Populated Information
The modal automatically fills in:
- **Vendor Name**: From purchase order vendor data
- **Purchase Order Number**: Current PO reference
- **Expected Delivery Date**: From PO expected date
- **Total Units by Configuration**: Calculated from PO items
- **Vendor Contact Information**: If available in vendor record

### 3. Required Information Entry

#### Delivery Date & Time
- **Date Selection**: Calendar picker (defaults to PO expected date)
- **Day Validation**: System checks if selected day allows deliveries
- **Time Selection**: Available 30-minute slots based on delivery day
- **Conflict Check**: Prevents scheduling conflicts with existing deliveries

#### Carrier Information
- **Carrier Name**: Transportation company (e.g., "Sysco Transport", "Vendor Fleet")
- **Driver Contact**: Primary driver name for delivery
- **Contact Phone**: Driver or dispatch phone number
- **Special Instructions**: Loading dock assignments, contact requirements

#### Warehouse Coordination
- **Loading Dock Assignment**: Specific dock number or area
- **Warehouse Manager Notification**: Automatic notification system
- **Special Handling Requirements**: Temperature control, fragile items, etc.

### 4. Exception Handling

#### Monday/Thursday Deliveries
- **System Alert**: "Monday and Thursday deliveries require special approval"
- **Process**: Contact warehouse manager for manual scheduling
- **Alternative**: Suggest Tuesday, Wednesday, or Friday options

#### Time Conflicts
- **Detection**: System checks existing schedules for time slot conflicts
- **Resolution**: Suggests alternative time slots
- **Override**: Warehouse manager can approve conflicts if necessary

#### Holiday/Closure Scheduling
- **Validation**: System checks against warehouse closure dates
- **Notification**: Alerts user to potential delivery issues
- **Rescheduling**: Automatic suggestions for next available delivery window

### 5. Confirmation Process
1. **Review Information**: All entered data displayed for verification
2. **Submit Schedule**: Creates delivery schedule record
3. **Confirmation Message**: "Delivery scheduled successfully for [Date] at [Time]"
4. **Notification Sent**: Automatic email/SMS to relevant parties

## System Integration

### Purchase Order Updates
- **Status Tracking**: PO status remains "Submitted" until delivery
- **Schedule Reference**: Delivery schedule ID linked to purchase order
- **Modification**: Changes to PO may require delivery rescheduling

### Warehouse Management
- **Dock Assignments**: Integrated with warehouse dock management
- **Staff Scheduling**: Warehouse staff notified of incoming deliveries
- **Inventory Preparation**: Receiving areas prepared for expected deliveries

### Vendor Communication
- **Delivery Confirmation**: Vendor receives delivery schedule confirmation
- **Contact Information**: Vendor can update carrier/driver details
- **Delivery Instructions**: Special requirements communicated to vendor

## Best Practices

### Timing Recommendations
- **Tuesday Deliveries**: Best for urgent items (shorter window)
- **Wednesday/Friday**: Preferred for larger shipments (longer windows)
- **Morning Slots**: 5:00 AM - 10:00 AM for priority deliveries
- **Afternoon Slots**: 10:00 AM - 6:00 PM for standard deliveries

### Communication Protocol
1. **Schedule Creation**: Immediate notification to all parties
2. **Changes/Updates**: 24-hour advance notice required
3. **Cancellations**: Minimum 4-hour notice to avoid dock fees
4. **Emergency Changes**: Direct phone contact with warehouse manager

### Quality Control
- **Verification**: Double-check delivery date against PO expected date
- **Contact Accuracy**: Verify carrier and driver contact information
- **Special Requirements**: Confirm any special handling needs
- **Dock Availability**: Ensure selected dock can accommodate delivery size

## Troubleshooting

### Common Issues

#### "Schedule Button Not Visible"
- **Cause**: Purchase order status is not "Submitted"
- **Solution**: Verify PO status, submit PO if still in "Draft"

#### "No Available Time Slots"
- **Cause**: Selected day is fully booked or not a delivery day
- **Solution**: Choose different day or contact warehouse manager

#### "Carrier Information Missing"
- **Cause**: Vendor has not provided carrier details
- **Solution**: Contact vendor to obtain carrier information

#### "Delivery Date Conflict"
- **Cause**: Selected date conflicts with warehouse closures
- **Solution**: Choose alternative date or contact warehouse manager

### Contact Information
- **Warehouse Manager**: Extension 2001
- **Dock Supervisor**: Extension 2002
- **Vendor Coordination**: Extension 2003
- **Emergency Contact**: Extension 9999

## System Features

### Real-Time Updates
- **Schedule Changes**: Immediate notification to all parties
- **Status Tracking**: Real-time delivery status updates
- **Conflict Detection**: Automatic prevention of scheduling conflicts

### Reporting
- **Daily Schedule**: Complete delivery schedule for each day
- **Weekly Planning**: Seven-day delivery forecast
- **Monthly Summary**: Delivery performance metrics
- **Vendor Performance**: Delivery timeliness and accuracy tracking

### Mobile Access
- **Responsive Design**: Works on tablets and smartphones
- **Field Updates**: Drivers can update delivery status in real-time
- **Push Notifications**: Instant alerts for schedule changes

This delivery scheduling system ensures efficient coordination between purchase orders, vendor deliveries, and warehouse operations, providing a seamless workflow from order placement to product receipt.