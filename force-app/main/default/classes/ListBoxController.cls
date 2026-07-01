public with sharing class ListBoxController {
    
    @AuraEnabled(cacheable=true)
    public static List<Map<String, String>> getAllObjects() {
        List<Map<String, String>> objectList = new List<Map<String, String>>();
        try {
            Map<String, SObjectType> globalDescribe = Schema.getGlobalDescribe();
            
            for (String objName : globalDescribe.keySet()) {
                DescribeSObjectResult descResult = globalDescribe.get(objName).getDescribe();
                
                // Only suggest objects that are queryable and visible to the admin
                if (descResult.isQueryable() && !descResult.isCustomSetting()) {
                    Map<String, String> objMap = new Map<String, String>();
                    objMap.put('label', descResult.getLabel()); // e.g. "Contact"
                    objMap.put('value', descResult.getName());  // e.g. "Contact"
                    objectList.add(objMap);
                }
            }
            
            objectList = sortRecords(objectList, 'label');
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
        return objectList;
    }

    @AuraEnabled(cacheable=true)
    public static List<Map<String, String>> getFieldsByObject(String objectApiName) {
        List<Map<String, String>> fieldOptions = new List<Map<String, String>>();
        if (String.isBlank(objectApiName)) {
            return fieldOptions;
        }
        try {
            SObjectType sObjectType = Schema.getGlobalDescribe().get(objectApiName);
            if (sObjectType == null) {
                throw new AuraHandledException('The entered Object API Name does not exist in this Org.');
            }
            Map<String, SObjectField> fieldMap = sObjectType.getDescribe().fields.getMap();
            for (SObjectField field : fieldMap.values()) {
                DescribeFieldResult fieldDescribe = field.getDescribe();
                Map<String, String> option = new Map<String, String>();
                option.put('label', fieldDescribe.getLabel());
                option.put('value', fieldDescribe.getName());
                fieldOptions.add(option);
            }
            fieldOptions = sortRecords(fieldOptions, 'label');
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
        return fieldOptions;
    }

    // private static List<Map<String, String>> sortRecords(List<Map<String, String>> records, String key) {
    //     Integer n = records.size();
    //     for (Integer i = 0; i < n-1; i++) {
    //         for (Integer j = 0; j < n-i-1; j++) {
    //             if (records[j].get(key).toLowerCase().compareTo(records[j+1].get(key).toLowerCase()) > 0) {
    //                 Map<String, String> temp = records[j];
    //                 records[j] = records[j+1];
    //                 records[j+1] = temp;
    //             }
    //         }
    //     }
    //     return records;
    // }

    private static List<Map<String, String>> sortRecords(List<Map<String, String>> records, String key) {
    
    Map<String, Map<String, String>> sortedMap = new Map<String, Map<String, String>>();
    List<String> labelList = new List<String>();
    
    for (Map<String, String> rec : records) {
        String sortValue = rec.containsKey(key) ? rec.get(key).toLowerCase() : '';
        String uniqueKey = sortValue + '_' + Crypto.getRandomInteger(); 
        
        sortedMap.put(uniqueKey, rec);
        labelList.add(uniqueKey);
    }
    
    labelList.sort();

    List<Map<String, String>> resultList = new List<Map<String, String>>();
    for (String uniqueKey : labelList) {
        resultList.add(sortedMap.get(uniqueKey));
    }
    
    return resultList;
}

}
