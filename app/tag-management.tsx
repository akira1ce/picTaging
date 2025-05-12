import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AntDesign } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { router } from "expo-router";

interface Tag {
  id: string;
  name: string;
  groupId?: string;
  isTimeTag?: boolean;
}

interface TagGroup {
  id: string;
  name: string;
  tags: Tag[];
}

const TagManagementScreen = () => {
  const [tagGroups, setTagGroups] = useState<TagGroup[]>([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [newTagName, setNewTagName] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  useEffect(() => {
    loadTagGroups();
  }, []);

  const loadTagGroups = async () => {
    try {
      const savedGroups = await AsyncStorage.getItem("tagGroups");
      if (savedGroups) {
        setTagGroups(JSON.parse(savedGroups));
      }
    } catch (error) {
      console.error("加载标签组失败:", error);
      Toast.show({
        type: "error",
        text1: "错误",
        text2: "加载标签组失败",
      });
    }
  };

  const saveTagGroups = async (groups: TagGroup[]) => {
    try {
      await AsyncStorage.setItem("tagGroups", JSON.stringify(groups));
      setTagGroups(groups);
    } catch (error) {
      console.error("保存标签组失败:", error);
      Toast.show({
        type: "error",
        text1: "错误",
        text2: "保存标签组失败",
      });
    }
  };

  const addGroup = () => {
    if (!newGroupName.trim()) return;
    const newGroup: TagGroup = {
      id: Date.now().toString(),
      name: newGroupName,
      tags: [],
    };
    const updatedGroups = [...tagGroups, newGroup];
    saveTagGroups(updatedGroups);
    setNewGroupName("");
    Toast.show({
      type: "success",
      text1: "成功",
      text2: `已添加分组「${newGroupName}」`,
    });
  };

  const addTag = () => {
    if (!newTagName.trim() || !selectedGroupId) return;
    const updatedGroups = tagGroups.map((group) => {
      if (group.id === selectedGroupId) {
        return {
          ...group,
          tags: [
            ...group.tags,
            {
              id: Date.now().toString(),
              name: newTagName,
            },
          ],
        };
      }
      return group;
    });
    saveTagGroups(updatedGroups);
    setNewTagName("");
    Toast.show({
      type: "success",
      text1: "成功",
      text2: `已添加标签「${newTagName}」`,
    });
  };

  const deleteGroup = (groupId: string) => {
    Alert.alert("删除分组", "确定要删除这个分组吗？删除后分组内的所有标签都会被删除。", [
      { text: "取消" },
      {
        text: "确定",
        onPress: () => {
          const groupToDelete = tagGroups.find((g) => g.id === groupId);
          const updatedGroups = tagGroups.filter((group) => group.id !== groupId);
          saveTagGroups(updatedGroups);
          if (selectedGroupId === groupId) {
            setSelectedGroupId(null);
          }
          Toast.show({
            type: "success",
            text1: "成功",
            text2: `已删除分组「${groupToDelete?.name || ""}」`,
          });
        },
      },
    ]);
  };

  const deleteTag = (groupId: string, tagId: string) => {
    const groupWithTag = tagGroups.find((g) => g.id === groupId);
    const tagToDelete = groupWithTag?.tags.find((t) => t.id === tagId);

    Alert.alert("删除标签", "确定要删除这个标签吗？", [
      { text: "取消" },
      {
        text: "确定",
        onPress: () => {
          const updatedGroups = tagGroups.map((group) => {
            if (group.id === groupId) {
              return {
                ...group,
                tags: group.tags.filter((tag) => tag.id !== tagId),
              };
            }
            return group;
          });
          saveTagGroups(updatedGroups);
          Toast.show({
            type: "success",
            text1: "成功",
            text2: `已删除标签「${tagToDelete?.name || ""}」`,
          });
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <AntDesign name="arrowleft" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>标签管理</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.addSection}>
        <View style={styles.addGroupSection}>
          <TextInput
            style={styles.input}
            placeholder="新建分组"
            value={newGroupName}
            onChangeText={setNewGroupName}
          />
          <TouchableOpacity style={styles.addButton} onPress={addGroup}>
            <AntDesign name="plus" size={24} color="white" />
          </TouchableOpacity>
        </View>

        <View style={styles.addTagSection}>
          <View style={styles.tagInputContainer}>
            <TextInput
              style={[styles.input, !selectedGroupId && styles.inputDisabled]}
              placeholder={selectedGroupId ? "新建标签" : "请先选择分组"}
              value={newTagName}
              onChangeText={setNewTagName}
              editable={!!selectedGroupId}
            />
            <TouchableOpacity
              style={[styles.addButton, !selectedGroupId && styles.disabled]}
              onPress={addTag}
              disabled={!selectedGroupId}>
              <AntDesign name="plus" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView style={styles.groupsContainer}>
        {tagGroups.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>尚未创建任何分组</Text>
          </View>
        ) : (
          tagGroups.map((group) => (
            <View key={group.id} style={styles.groupSection}>
              <TouchableOpacity
                style={[
                  styles.groupHeader,
                  selectedGroupId === group.id && styles.groupHeaderSelected,
                ]}
                onPress={() => {
                  setSelectedGroupId(selectedGroupId === group.id ? null : group.id);
                }}>
                <View style={styles.groupHeaderLeft}>
                  <Text style={styles.groupName}>{group.name}</Text>
                </View>
                <View style={styles.groupHeaderRight}>
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      deleteGroup(group.id);
                    }}
                    style={styles.deleteGroupButton}>
                    <AntDesign name="delete" size={20} color="#ff4444" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
              <>
                <View style={styles.tagsContainer}>
                  {group.tags.length === 0 ? (
                    <Text style={styles.emptyTagsText}>没有标签</Text>
                  ) : (
                    group.tags.map((tag) => (
                      <TouchableOpacity
                        key={tag.id}
                        style={styles.tag}
                        onLongPress={() => deleteTag(group.id, tag.id)}>
                        <Text style={styles.tagText}>{tag.name}</Text>
                        <TouchableOpacity
                          style={styles.deleteTagButton}
                          onPress={() => deleteTag(group.id, tag.id)}>
                          <AntDesign name="close" size={12} color="#777" />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              </>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  addSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  addGroupSection: {
    flexDirection: "row",
    marginBottom: 12,
  },
  addTagSection: {
    marginTop: 8,
  },
  tagInputContainer: {
    flexDirection: "row",
  },
  input: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    fontSize: 15,
    backgroundColor: "#fafafa",
  },
  inputDisabled: {
    backgroundColor: "#f5f5f5",
    borderColor: "#ddd",
  },
  addButton: {
    backgroundColor: "#2196F3",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#2196F3",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  disabled: {
    backgroundColor: "#bdbdbd",
    opacity: 0.7,
  },
  groupsContainer: {
    flex: 1,
    padding: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#777',
  },
  emptyTagsText: {
    fontSize: 14,
    color: '#999',
    padding: 8,
    fontStyle: 'italic',
  },
  groupSection: {
    marginBottom: 20,
    borderRadius: 16,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  groupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f8f9fa",
    borderRadius: 16,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  groupHeaderSelected: {
    backgroundColor: "#e3f2fd",
    borderColor: "#2196F3",
    borderWidth: 1,
  },
  groupHeaderLeft: {
    flex: 1,
  },
  groupHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  deleteGroupButton: {
    padding: 8,
  },
  groupName: {
    fontSize: 17,
    fontWeight: "600",
    color: "#2c3e50",
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 12,
    backgroundColor: "#fff",
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  tag: {
    backgroundColor: "#f1f3f5",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 4,
    marginBottom: 4,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  tagText: {
    color: "#495057",
    fontSize: 15,
    fontWeight: "500",
    marginRight: 4,
  },
  deleteTagButton: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#e0e0e0",
    justifyContent: "center",
    alignItems: "center",
  },
});

export default TagManagementScreen; 